import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  account,
  accountDeletions,
  favorites,
  listingImages,
  listings,
  profiles,
  session,
  user,
} from "@/db/schema";
import { removeImage } from "@/lib/storage";
import { dueDeletions } from "@/server/queries/account-deletion";

/**
 * Apaga o que é só da pessoa e anonimiza o resto.
 *
 * Módulo comum, e não Server Action, porque roda de dois lugares: a rota de
 * manutenção que o agendador chama, e o script de linha de comando.
 *
 * A divisão entre apagar e anonimizar está na ADR-0023: o que pende de duas
 * pessoas — mensagens, avaliações, registros de moderação — permanece ligado a
 * uma conta anônima, porque apagá-lo tiraria de quem ficou o histórico dela.
 */
export async function purgeAccount(userId: string): Promise<void> {
  const ownListings = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.authorId, userId));

  const listingIds = ownListings.map((row) => row.id);

  const images =
    listingIds.length === 0
      ? []
      : await db
          .select({ storageKey: listingImages.storageKey })
          .from(listingImages)
          .where(inArray(listingImages.listingId, listingIds));

  await db.transaction(async (tx) => {
    // As conversas sobrevivem porque `conversations.listing_id` é SET NULL.
    if (listingIds.length > 0) {
      await tx.delete(listings).where(inArray(listings.id, listingIds));
    }

    await tx.delete(favorites).where(eq(favorites.userId, userId));
    await tx.delete(profiles).where(eq(profiles.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx.delete(session).where(eq(session.userId, userId));

    await tx
      .update(user)
      .set({
        name: "Membro removido",
        // O domínio `.invalid` é reservado pela RFC 2606 e nunca resolve, então
        // o endereço não pode colidir com o de ninguém nem receber mensagem.
        email: `removido-${randomUUID()}@removido.invalid`,
        emailVerified: false,
        image: null,
      })
      .where(eq(user.id, userId));

    await tx
      .update(accountDeletions)
      .set({ completedAt: new Date() })
      .where(eq(accountDeletions.userId, userId));
  });

  // Fora da transação: apagar arquivo não é reversível junto com o banco, e uma
  // falha aqui deixa arquivo órfão, não dado pessoal no ar — as linhas já foram.
  for (const image of images) {
    if (image.storageKey) await removeImage(image.storageKey);
  }
}

/** Expurga todas as contas cujo prazo de arrependimento venceu. */
export async function purgeDueAccounts(): Promise<{ purged: number }> {
  const due = await dueDeletions();

  for (const row of due) {
    await purgeAccount(row.userId);
  }

  return { purged: due.length };
}
