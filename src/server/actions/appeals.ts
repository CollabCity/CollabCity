"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appeals, listings, reports, reviews, suspensions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isModerator } from "@/server/queries/reports";
import { pruneRateLimits, rateLimit } from "@/server/rate-limit";
import { type ActionState, errorState, successState } from "./types";

const MIN_BODY = 20;
const MAX_BODY = 2000;

function validateBody(formData: FormData): { body: string } | { error: string } {
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < MIN_BODY) {
    return {
      error: `Explique o que a moderação deixou de considerar, em pelo menos ${MIN_BODY} caracteres.`,
    };
  }
  if (body.length > MAX_BODY) return { error: `Use no máximo ${MAX_BODY} caracteres.` };
  return { body };
}

/**
 * Contesta uma suspensão.
 *
 * Usa `getSession`, e **não** `requireSession`: quem está suspenso é justamente
 * quem precisa desta ação, e `requireSession` o redirecionaria para fora dela.
 * A autorização é feita aqui, à mão, e é mais estreita — só a própria pessoa,
 * e só enquanto a suspensão estiver em vigor.
 */
export async function appealSuspension(
  suspensionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return errorState("Entre na sua conta para contestar.");

  pruneRateLimits();
  if (!rateLimit(`appeal:submit:${session.user.id}`, 5, 60 * 60 * 1000)) {
    return errorState("Você enviou muitas contestações na última hora.");
  }

  const parsed = validateBody(formData);
  if ("error" in parsed) return errorState(parsed.error);

  const [suspension] = await db
    .select({ id: suspensions.id })
    .from(suspensions)
    .where(
      and(
        eq(suspensions.id, suspensionId),
        eq(suspensions.userId, session.user.id),
        isNull(suspensions.liftedAt),
      ),
    )
    .limit(1);

  if (!suspension) return errorState("Suspensão não encontrada.");

  const [created] = await db
    .insert(appeals)
    .values({ authorId: session.user.id, suspensionId, body: parsed.body })
    .onConflictDoNothing()
    .returning({ id: appeals.id });

  if (!created) return errorState("Você já contestou esta decisão.");

  revalidatePath("/conta-suspensa");
  revalidatePath("/painel/contestacoes");

  return successState("Contestação enviada. A moderação vai revisar a decisão.");
}

/**
 * Contesta uma denúncia acolhida sobre o próprio conteúdo.
 *
 * A pessoa aqui não está suspensa, então `getSession` bastaria; mas a checagem
 * de posse é o que importa: só o autor do anúncio arquivado ou da avaliação
 * ocultada pode reclamar dela.
 */
export async function appealReport(
  reportId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return errorState("Entre na sua conta para contestar.");

  pruneRateLimits();
  if (!rateLimit(`appeal:submit:${session.user.id}`, 5, 60 * 60 * 1000)) {
    return errorState("Você enviou muitas contestações na última hora.");
  }

  const parsed = validateBody(formData);
  if ("error" in parsed) return errorState(parsed.error);

  const [report] = await db
    .select({ id: reports.id })
    .from(reports)
    .leftJoin(listings, eq(listings.id, reports.listingId))
    .leftJoin(reviews, eq(reviews.id, reports.reviewId))
    .where(
      and(
        eq(reports.id, reportId),
        eq(reports.status, "upheld"),
        // Uma das duas condições precisa valer: o conteúdo removido é dela.
        sql`(${listings.authorId} = ${session.user.id} OR ${reviews.authorId} = ${session.user.id})`,
      ),
    )
    .limit(1);

  if (!report) return errorState("Decisão não encontrada.");

  const [created] = await db
    .insert(appeals)
    .values({ authorId: session.user.id, reportId, body: parsed.body })
    .onConflictDoNothing()
    .returning({ id: appeals.id });

  if (!created) return errorState("Você já contestou esta decisão.");

  revalidatePath("/painel/decisoes");
  revalidatePath("/painel/contestacoes");

  return successState("Contestação enviada. A moderação vai revisar a decisão.");
}

/**
 * Decisão da moderação sobre uma contestação.
 *
 * **Quem decidiu não julga o próprio recurso.** É a regra que dá sentido à
 * contestação: revisar a si mesmo tende a confirmar a decisão original, e a
 * pessoa teria só a aparência de um segundo olhar.
 *
 * Aceitar desfaz o que a decisão original fez: a suspensão é encerrada, o
 * anúncio volta a `open`, a avaliação deixa de ficar oculta.
 */
export async function resolveAppeal(
  appealId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return errorState("Contestação não encontrada.");
  if (!(await isModerator(session.user.id))) return errorState("Contestação não encontrada.");

  const decision = formData.get("decision");
  if (decision !== "accepted" && decision !== "rejected") {
    return errorState("Escolha aceitar ou manter a decisão.");
  }

  const note = String(formData.get("note") ?? "").trim();
  if (note.length > MAX_BODY)
    return errorState(`A nota deve ter no máximo ${MAX_BODY} caracteres.`);

  const [appeal] = await db
    .select({
      id: appeals.id,
      suspensionId: appeals.suspensionId,
      reportId: appeals.reportId,
    })
    .from(appeals)
    .where(and(eq(appeals.id, appealId), eq(appeals.status, "open")))
    .limit(1);

  if (!appeal) return errorState("Esta contestação já foi resolvida.");

  const decider = await originalDeciderOf(appeal);
  if (decider && decider === session.user.id) {
    return errorState("Quem tomou a decisão não pode julgar a contestação dela.");
  }

  await db.transaction(async (tx) => {
    if (decision === "accepted") {
      if (appeal.suspensionId) {
        await tx
          .update(suspensions)
          .set({
            liftedAt: new Date(),
            liftedBy: session.user.id,
            liftReason: note || "Contestação aceita.",
          })
          .where(and(eq(suspensions.id, appeal.suspensionId), isNull(suspensions.liftedAt)));
      }

      if (appeal.reportId) {
        const [report] = await tx
          .select({ listingId: reports.listingId, reviewId: reports.reviewId })
          .from(reports)
          .where(eq(reports.id, appeal.reportId))
          .limit(1);

        if (report?.listingId) {
          await tx
            .update(listings)
            .set({ status: "open" })
            .where(eq(listings.id, report.listingId));
        }
        if (report?.reviewId) {
          await tx.update(reviews).set({ hiddenAt: null }).where(eq(reviews.id, report.reviewId));
        }

        await tx
          .update(reports)
          .set({ status: "dismissed" })
          .where(eq(reports.id, appeal.reportId));
      }
    }

    await tx
      .update(appeals)
      .set({
        status: decision,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        resolutionNote: note || null,
      })
      .where(eq(appeals.id, appealId));
  });

  revalidatePath("/painel/contestacoes");
  revalidatePath("/painel/denuncias");
  revalidatePath("/anuncios");

  return successState(
    decision === "accepted" ? "Contestação aceita e decisão desfeita." : "Decisão mantida.",
  );
}

/** Quem tomou a decisão contestada, para barrar a autorrevisão. */
async function originalDeciderOf(appeal: {
  suspensionId: string | null;
  reportId: string | null;
}): Promise<string | null> {
  if (appeal.suspensionId) {
    const [row] = await db
      .select({ createdBy: suspensions.createdBy })
      .from(suspensions)
      .where(eq(suspensions.id, appeal.suspensionId))
      .limit(1);
    return row?.createdBy ?? null;
  }

  if (appeal.reportId) {
    const [row] = await db
      .select({ resolvedBy: reports.resolvedBy })
      .from(reports)
      .where(eq(reports.id, appeal.reportId))
      .limit(1);
    return row?.resolvedBy ?? null;
  }

  return null;
}
