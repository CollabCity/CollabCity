"use server";

import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { account, favorites, listingImages, listings, profiles, session, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { removeImage } from "@/lib/storage";
import { type ActionState, errorState } from "./types";

/**
 * Exclusão de conta, no sentido do art. 18 da LGPD.
 *
 * O que é **apagado de verdade**: perfil, anúncios e as fotos deles, salvos,
 * credenciais e sessões. Nada disso sobrevive.
 *
 * O que é **anonimizado**: a linha em `user`. Nome vira "Membro removido",
 * e-mail vira um endereço inválido e único, foto some. A linha permanece
 * porque mensagens e avaliações pendem dela — e essas são de duas pessoas.
 * Apagá-la em cascata destruiria a conversa e a reputação de quem ficou, e o
 * direito de um não pode virar perda do outro. Dado anonimizado deixa de ser
 * dado pessoal (art. 12), então o direito é atendido.
 *
 * O que **permanece atribuído à conta anonimizada**: mensagens enviadas e
 * avaliações escritas sobre outras pessoas. O texto continua; o autor, não.
 *
 * Registros de moderação — denúncias, suspensões e contestações — também
 * permanecem, ligados à conta anonimizada, porque documentam decisões tomadas
 * sobre terceiros e sustentam o histórico de quem foi afetado.
 */
export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await getSession();
  if (!current) return errorState("Entre na sua conta para continuar.");

  const confirmation = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  // Digitar o próprio e-mail é a confirmação. A ação é irreversível, e um
  // clique único num botão vermelho não é decisão suficiente para isso.
  if (confirmation !== current.user.email.toLowerCase()) {
    return errorState("Digite exatamente o e-mail da sua conta para confirmar.");
  }

  const userId = current.user.id;

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
  });

  // Fora da transação: apagar arquivo não é reversível junto com o banco, e uma
  // falha aqui deixa arquivo órfão, não dado pessoal no ar — as linhas já foram.
  for (const image of images) {
    if (image.storageKey) await removeImage(image.storageKey);
  }

  // Apagar as linhas de `session` não basta: o Better Auth guarda a sessão em
  // cookie por cinco minutos para poupar consulta ao banco (ver
  // docs/seguranca.md), e sem encerrar de verdade a pessoa seguiria navegando
  // como se a conta existisse. `signOut` limpa o cookie.
  await auth.api.signOut({ headers: await headers() });

  revalidatePath("/", "layout");
  redirect("/?conta=excluida");
}
