"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { conversations, listings, messages } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { messageSchema } from "@/lib/validations/auth";
import { pruneRateLimits, rateLimit } from "@/server/rate-limit";
import { type ActionState, errorState, successState } from "./types";

/**
 * Abre (ou reaproveita) a conversa sobre um anúncio e envia a primeira mensagem.
 * A unicidade `(listing_id, requester_id)` garante uma conversa por interessado.
 */
export async function startConversation(
  listingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  pruneRateLimits();
  if (!rateLimit(`conversation:start:${session.user.id}`, 20, 60 * 60 * 1000)) {
    return errorState("Você iniciou muitas conversas na última hora.");
  }

  const parsed = messageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return errorState(
      "Escreva uma mensagem antes de enviar.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const [listing] = await db
    .select({ id: listings.id, authorId: listings.authorId })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!listing) return errorState("Anúncio não encontrado.");
  if (listing.authorId === session.user.id) {
    return errorState("Você não pode iniciar uma conversa com o próprio anúncio.");
  }

  const conversationId = await db.transaction(async (tx) => {
    const [conversation] = await tx
      .insert(conversations)
      .values({
        listingId,
        requesterId: session.user.id,
        ownerId: listing.authorId,
      })
      .onConflictDoUpdate({
        target: [conversations.listingId, conversations.requesterId],
        set: { lastMessageAt: new Date() },
      })
      .returning({ id: conversations.id });

    if (!conversation) throw new Error("Falha ao abrir a conversa");

    await tx.insert(messages).values({
      conversationId: conversation.id,
      senderId: session.user.id,
      body: parsed.data.body,
    });

    return conversation.id;
  });

  revalidatePath("/mensagens");
  redirect(`/mensagens/${conversationId}`);
}

export async function sendMessage(
  conversationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  pruneRateLimits();
  if (!rateLimit(`message:send:${session.user.id}`, 60, 10 * 60 * 1000)) {
    return errorState("Aguarde um pouco antes de enviar mais mensagens.");
  }

  const parsed = messageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return errorState("Escreva uma mensagem antes de enviar.");
  }

  const [conversation] = await db
    .select({
      id: conversations.id,
      ownerId: conversations.ownerId,
      requesterId: conversations.requesterId,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  const isParticipant =
    conversation &&
    (conversation.ownerId === session.user.id || conversation.requesterId === session.user.id);

  // A mesma resposta para conversa inexistente e para conversa alheia: revelar a
  // diferença permitiria descobrir quais identificadores existem.
  if (!isParticipant) return errorState("Conversa não encontrada.");

  await db.transaction(async (tx) => {
    await tx.insert(messages).values({
      conversationId,
      senderId: session.user.id,
      body: parsed.data.body,
    });
    await tx
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
  });

  revalidatePath(`/mensagens/${conversationId}`);
  revalidatePath("/mensagens");
  return successState("Mensagem enviada.");
}
