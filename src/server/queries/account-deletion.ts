import { and, eq, isNull, lte } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { accountDeletions } from "@/db/schema";

/**
 * O pedido de exclusão em aberto de uma conta, se houver.
 *
 * "Em aberto" é `cancelled_at` e `completed_at` nulos — a mesma condição do
 * índice parcial `account_deletions_pending_key`, que garante no máximo um.
 */
export const pendingDeletion = cache(async (userId: string) => {
  const [row] = await db
    .select({
      id: accountDeletions.id,
      requestedAt: accountDeletions.requestedAt,
      scheduledFor: accountDeletions.scheduledFor,
    })
    .from(accountDeletions)
    .where(
      and(
        eq(accountDeletions.userId, userId),
        isNull(accountDeletions.cancelledAt),
        isNull(accountDeletions.completedAt),
      ),
    )
    .limit(1);

  return row ?? null;
});

/** Contas cujo prazo venceu e que aguardam expurgo. */
export async function dueDeletions() {
  return db
    .select({ id: accountDeletions.id, userId: accountDeletions.userId })
    .from(accountDeletions)
    .where(
      and(
        isNull(accountDeletions.cancelledAt),
        isNull(accountDeletions.completedAt),
        lte(accountDeletions.scheduledFor, new Date()),
      ),
    )
    .limit(200);
}
