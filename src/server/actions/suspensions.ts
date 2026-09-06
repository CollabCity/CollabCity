"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { suspensions } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { isAdmin } from "@/server/queries/reports";
import { type ActionState, errorState, successState } from "./types";

const MAX_REASON = 1000;

/**
 * Suspende uma conta.
 *
 * Só admin. O motivo é obrigatório e vai inteiro para a pessoa suspensa: uma
 * suspensão sem justificativa não dá o que corrigir nem o que contestar.
 */
export async function suspendAccount(
  userId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  // 404 em texto, como o resto do sistema: quem não é admin não recebe
  // confirmação de que a operação existe.
  if (!(await isAdmin(session.user.id))) return errorState("Ação não encontrada.");

  if (userId === session.user.id) {
    return errorState("Você não pode suspender a própria conta.");
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 10) {
    return errorState("Escreva o motivo da suspensão, com pelo menos 10 caracteres.");
  }
  if (reason.length > MAX_REASON) {
    return errorState(`O motivo deve ter no máximo ${MAX_REASON} caracteres.`);
  }

  // O índice parcial `suspensions_active_key` garante uma suspensão em vigor
  // por conta; este `onConflictDoNothing` transforma a corrida entre dois
  // admins em mensagem, e não em erro de banco.
  const [created] = await db
    .insert(suspensions)
    .values({ userId, createdBy: session.user.id, reason })
    .onConflictDoNothing()
    .returning({ id: suspensions.id });

  if (!created) return errorState("Esta conta já está suspensa.");

  revalidatePath("/anuncios");
  revalidatePath("/painel/denuncias");
  revalidatePath(`/membros/${userId}`);

  return successState("Conta suspensa.");
}

/** Reativa uma conta suspensa. Também só admin. */
export async function liftSuspension(
  suspensionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (!(await isAdmin(session.user.id))) return errorState("Ação não encontrada.");

  const note = String(formData.get("note") ?? "").trim();
  if (note.length > MAX_REASON) {
    return errorState(`A nota deve ter no máximo ${MAX_REASON} caracteres.`);
  }

  const [lifted] = await db
    .update(suspensions)
    .set({ liftedAt: new Date(), liftedBy: session.user.id, liftReason: note || null })
    .where(and(eq(suspensions.id, suspensionId), isNull(suspensions.liftedAt)))
    .returning({ userId: suspensions.userId });

  if (!lifted) return errorState("Esta suspensão já foi encerrada.");

  revalidatePath("/anuncios");
  revalidatePath("/painel/denuncias");
  revalidatePath(`/membros/${lifted.userId}`);

  return successState("Conta reativada.");
}
