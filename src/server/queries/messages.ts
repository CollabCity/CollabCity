import { and, asc, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { conversations, listings, messages, user } from "@/db/schema";

/** Conversas em que o membro participa, como autor ou como interessado. */
export async function getConversationsForUser(userId: string) {
  const requester = alias(user, "requester");
  const owner = alias(user, "owner");

  return db
    .select({
      id: conversations.id,
      listingId: conversations.listingId,
      listingTitle: listings.title,
      lastMessageAt: conversations.lastMessageAt,
      counterpartName: sql<string>`CASE WHEN ${conversations.ownerId} = ${userId}
        THEN ${requester.name} ELSE ${owner.name} END`,
      unreadCount: sql<number>`(
        SELECT count(*)::int FROM ${messages}
        WHERE ${messages.conversationId} = ${conversations.id}
          AND ${messages.senderId} <> ${userId}
          AND ${messages.readAt} IS NULL
      )`,
      lastMessage: sql<string | null>`(
        SELECT ${messages.body} FROM ${messages}
        WHERE ${messages.conversationId} = ${conversations.id}
        ORDER BY ${messages.createdAt} DESC LIMIT 1
      )`,
    })
    .from(conversations)
    .innerJoin(listings, eq(listings.id, conversations.listingId))
    .innerJoin(requester, eq(requester.id, conversations.requesterId))
    .innerJoin(owner, eq(owner.id, conversations.ownerId))
    .where(or(eq(conversations.ownerId, userId), eq(conversations.requesterId, userId)))
    .orderBy(desc(conversations.lastMessageAt));
}

/**
 * Conversa e suas mensagens. Retorna `null` quando o membro não participa da
 * conversa, para que a rota responda 404 sem revelar que ela existe.
 */
export async function getConversation(conversationId: string, userId: string) {
  const [conversation] = await db
    .select({
      id: conversations.id,
      listingId: conversations.listingId,
      listingTitle: listings.title,
      ownerId: conversations.ownerId,
      requesterId: conversations.requesterId,
    })
    .from(conversations)
    .innerJoin(listings, eq(listings.id, conversations.listingId))
    .where(
      and(
        eq(conversations.id, conversationId),
        or(eq(conversations.ownerId, userId), eq(conversations.requesterId, userId)),
      ),
    )
    .limit(1);

  if (!conversation) return null;

  const thread = await db
    .select({
      id: messages.id,
      body: messages.body,
      senderId: messages.senderId,
      senderName: user.name,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(user, eq(user.id, messages.senderId))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return { ...conversation, messages: thread };
}

/** Marca como lidas as mensagens que o membro recebeu na conversa. */
export async function markConversationRead(conversationId: string, userId: string) {
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    );
}

/** Total de mensagens não lidas, exibido na barra de navegação. */
export async function countUnreadMessages(userId: string) {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        ne(messages.senderId, userId),
        isNull(messages.readAt),
        or(eq(conversations.ownerId, userId), eq(conversations.requesterId, userId)),
      ),
    );

  return row?.total ?? 0;
}
