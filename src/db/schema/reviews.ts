import { relations, sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { conversations } from "./messaging";

/**
 * Avaliação de um membro por outro.
 *
 * Fica presa a uma conversa, e não solta entre dois usuários: a conversa é o
 * único registro de que as duas pessoas de fato se falaram sobre um anúncio.
 * Sem essa âncora, qualquer conta poderia avaliar qualquer outra, e uma fila de
 * contas novas derrubaria a nota de alguém sem nunca ter trocado uma palavra.
 *
 * As restrições abaixo são de banco, não de aplicação, porque são invariantes:
 * uma avaliação por pessoa em cada conversa, nota de 1 a 5, comentário de até
 * 300 caracteres e ninguém avaliando a si mesmo.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    /** Quem escreveu a avaliação. */
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Quem está sendo avaliado. */
    subjectId: text("subject_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /**
     * Quando a moderação ocultou a avaliação.
     *
     * Ocultar, e não apagar: a linha continua auditável, a decisão é
     * reversível, e a denúncia que a motivou não some por cascata junto com o
     * alvo — o que aconteceria se acolher significasse `DELETE`.
     */
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  },
  (table) => [
    unique("reviews_conversation_author_key").on(table.conversationId, table.authorId),
    check("reviews_rating_range", sql`${table.rating} BETWEEN 1 AND 5`),
    check("reviews_comment_length", sql`char_length(${table.comment}) <= 300`),
    check("reviews_no_self_review", sql`${table.authorId} <> ${table.subjectId}`),
    index("reviews_subject_idx").on(table.subjectId, table.createdAt.desc()),
    index("reviews_conversation_idx").on(table.conversationId),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  conversation: one(conversations, {
    fields: [reviews.conversationId],
    references: [conversations.id],
  }),
  author: one(user, { fields: [reviews.authorId], references: [user.id] }),
  subject: one(user, { fields: [reviews.subjectId], references: [user.id] }),
}));
