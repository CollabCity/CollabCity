"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { conversations, listings, reports, reviews } from "@/db/schema";
import { requireSession } from "@/lib/session";
import type { ReportTarget } from "@/lib/types";
import { reportSchema } from "@/lib/validations/report";
import { isModerator } from "@/server/queries/reports";
import { pruneRateLimits, rateLimit } from "@/server/rate-limit";
import { type ActionState, errorState, successState } from "./types";

/**
 * Confirma que o alvo existe e que esta pessoa pode denunciá-lo.
 *
 * Denunciar o próprio conteúdo não faz sentido e seria um jeito barato de
 * entupir a fila. Conversa é caso à parte: só denuncia quem participou dela —
 * caso contrário bastaria adivinhar um identificador para submeter uma conversa
 * alheia à leitura da moderação.
 */
async function assertReportable(
  target: ReportTarget,
  targetId: string,
  userId: string,
): Promise<string | null> {
  if (target === "listing") {
    const [row] = await db
      .select({ authorId: listings.authorId })
      .from(listings)
      .where(eq(listings.id, targetId))
      .limit(1);

    if (!row) return "Anúncio não encontrado.";
    if (row.authorId === userId) return "Você não pode denunciar o próprio anúncio.";
    return null;
  }

  if (target === "review") {
    const [row] = await db
      .select({ authorId: reviews.authorId })
      .from(reviews)
      .where(eq(reviews.id, targetId))
      .limit(1);

    if (!row) return "Avaliação não encontrada.";
    if (row.authorId === userId) return "Você não pode denunciar a avaliação que você escreveu.";
    return null;
  }

  const [row] = await db
    .select({ ownerId: conversations.ownerId, requesterId: conversations.requesterId })
    .from(conversations)
    .where(eq(conversations.id, targetId))
    .limit(1);

  // A mesma resposta para conversa inexistente e para conversa alheia, como no
  // resto do sistema: distinguir revelaria quais identificadores existem.
  if (!row || (row.ownerId !== userId && row.requesterId !== userId)) {
    return "Conversa não encontrada.";
  }

  return null;
}

export async function reportContent(
  target: ReportTarget,
  targetId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  pruneRateLimits();
  if (!rateLimit(`report:submit:${session.user.id}`, 5, 60 * 60 * 1000)) {
    return errorState("Você enviou muitas denúncias na última hora.");
  }

  const parsed = reportSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return errorState(
      "Confira o motivo e a descrição.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const problem = await assertReportable(target, targetId, session.user.id);
  if (problem) return errorState(problem);

  const inserted = await db
    .insert(reports)
    .values({
      reporterId: session.user.id,
      listingId: target === "listing" ? targetId : null,
      reviewId: target === "review" ? targetId : null,
      conversationId: target === "conversation" ? targetId : null,
      reason: parsed.data.reason,
      details: parsed.data.details,
    })
    .onConflictDoNothing()
    .returning({ id: reports.id });

  if (inserted.length === 0) {
    return errorState("Você já denunciou este conteúdo. A moderação vai avaliá-lo.");
  }

  revalidatePath("/painel/denuncias");

  return successState(
    "Denúncia registrada. A moderação vai avaliar; se houver risco imediato, procure a polícia.",
  );
}

/**
 * Decisão da moderação sobre uma denúncia.
 *
 * Acolher aplica a consequência que cabe ao tipo de alvo: anúncio vai para
 * `archived` e some da busca, avaliação é ocultada e deixa de contar na média.
 * Conversa não tem conteúdo a remover — a plataforma ainda não suspende contas,
 * então acolher registra a decisão e a nota explica o que foi feito fora daqui.
 */
export async function resolveReport(
  reportId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  if (!(await isModerator(session.user.id))) {
    return errorState("Denúncia não encontrada.");
  }

  // A decisão vem do botão que enviou o formulário, e não de um argumento
  // vinculado: assim os dois botões compartilham o mesmo campo de nota, e a
  // escolha continua funcionando sem JavaScript.
  const decision = formData.get("decision");
  if (decision !== "upheld" && decision !== "dismissed") {
    return errorState("Escolha acolher ou descartar.");
  }

  const note = String(formData.get("note") ?? "").trim();
  if (note.length > 1000) return errorState("A nota deve ter no máximo 1000 caracteres.");

  const [report] = await db
    .select({
      id: reports.id,
      listingId: reports.listingId,
      reviewId: reports.reviewId,
    })
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.status, "open")))
    .limit(1);

  if (!report) return errorState("Esta denúncia já foi resolvida.");

  await db.transaction(async (tx) => {
    if (decision === "upheld") {
      if (report.listingId) {
        await tx
          .update(listings)
          .set({ status: "archived" })
          .where(eq(listings.id, report.listingId));
      }
      if (report.reviewId) {
        await tx
          .update(reviews)
          .set({ hiddenAt: new Date() })
          .where(eq(reviews.id, report.reviewId));
      }
    }

    await tx
      .update(reports)
      .set({
        status: decision,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        resolutionNote: note || null,
      })
      .where(eq(reports.id, reportId));
  });

  revalidatePath("/painel/denuncias");
  revalidatePath("/anuncios");

  return successState(decision === "upheld" ? "Denúncia acolhida." : "Denúncia descartada.");
}
