"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { accountDeletions } from "@/db/schema";
import { deletionDeadline } from "@/lib/account-deletion";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { type ActionState, errorState, successState } from "./types";

/**
 * Agenda a exclusão da conta.
 *
 * Agenda, e não executa: o conteúdo sai do ar imediatamente, mas o expurgo
 * espera o prazo de arrependimento. Quem clicou por impulso, ou por engano,
 * entra de novo e cancela — ver ADR-0024.
 */
export async function requestAccountDeletion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await getSession();
  if (!current) return errorState("Entre na sua conta para continuar.");

  const confirmation = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  // Digitar o próprio e-mail é a confirmação. O prazo protege do arrependimento;
  // isto protege do clique errado, que é problema diferente.
  if (confirmation !== current.user.email.toLowerCase()) {
    return errorState("Digite exatamente o e-mail da sua conta para confirmar.");
  }

  const [created] = await db
    .insert(accountDeletions)
    .values({
      userId: current.user.id,
      scheduledFor: deletionDeadline(env.ACCOUNT_DELETION_GRACE_DAYS),
    })
    // O índice parcial admite um pedido em aberto por conta; o conflito vira
    // mensagem em vez de erro de banco.
    .onConflictDoNothing()
    .returning({ id: accountDeletions.id });

  if (!created) return errorState("Já existe um pedido de exclusão em andamento.");

  // A sessão acaba aqui: quem pediu para sair não fica logado. Para cancelar,
  // entra de novo — o que é, por si, uma confirmação de que a conta é sua.
  await auth.api.signOut({ headers: await headers() });

  revalidatePath("/", "layout");
  redirect("/?conta=exclusao-agendada");
}

/** Cancela um pedido de exclusão ainda dentro do prazo. */
export async function cancelAccountDeletion(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const current = await getSession();
  if (!current) return errorState("Entre na sua conta para continuar.");

  const [cancelled] = await db
    .update(accountDeletions)
    .set({ cancelledAt: new Date() })
    .where(
      and(
        eq(accountDeletions.userId, current.user.id),
        isNull(accountDeletions.cancelledAt),
        isNull(accountDeletions.completedAt),
      ),
    )
    .returning({ id: accountDeletions.id });

  if (!cancelled) return errorState("Não há pedido de exclusão em andamento.");

  revalidatePath("/", "layout");

  return successState("Exclusão cancelada. Sua conta continua ativa.");
}
