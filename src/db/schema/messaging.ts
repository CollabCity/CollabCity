import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { listings } from "./listings";

/**
 * Conversa entre o autor de um anúncio e um interessado. Há no máximo uma
 * conversa por par (anúncio, interessado).
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    /** Quem iniciou o contato. */
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Autor do anúncio no momento em que a conversa começou. */
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("conversations_listing_requester_key").on(table.listingId, table.requesterId),
    index("conversations_owner_idx").on(table.ownerId, table.lastMessageAt.desc()),
    index("conversations_requester_idx").on(table.requesterId, table.lastMessageAt.desc()),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("messages_conversation_idx").on(table.conversationId, table.createdAt)],
);

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  listing: one(listings, { fields: [conversations.listingId], references: [listings.id] }),
  requester: one(user, { fields: [conversations.requesterId], references: [user.id] }),
  owner: one(user, { fields: [conversations.ownerId], references: [user.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(user, { fields: [messages.senderId], references: [user.id] }),
}));
