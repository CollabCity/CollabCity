import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { reportReason, reportStatus, staffRole } from "./enums";
import { listings } from "./listings";
import { conversations } from "./messaging";
import { reviews } from "./reviews";

/**
 * Quem pode ver e resolver denúncias.
 *
 * Fica em tabela própria, e não como coluna em `user`, pelo mesmo motivo de
 * `profiles`: aquela tabela é gerenciada pelo Better Auth e pode mudar entre
 * versões da biblioteca. Ser moderador é uma linha aqui — conceder e revogar é
 * um `INSERT` e um `DELETE`, sem migração.
 */
export const moderators = pgTable("moderators", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /**
   * `moderator` resolve denúncias; `admin` faz isso e também suspende contas.
   *
   * O papel é coluna, e não uma segunda tabela, porque as permissões são
   * encaixadas: todo admin é moderador. Duas tabelas exigiriam manter as duas
   * em sincronia e abririam a chance de um admin sem acesso à fila.
   */
  role: staffRole("role").notNull().default("moderator"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Denúncia de um conteúdo por um membro.
 *
 * O alvo é apontado por uma de três chaves estrangeiras, e não por um par
 * `(tipo, id)` genérico. Custa três colunas e paga com integridade real: o
 * banco garante que o alvo existe, e apagar um anúncio leva junto as denúncias
 * sobre ele, em vez de deixar linhas apontando para o nada.
 */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    reviewId: uuid("review_id").references(() => reviews.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    reason: reportReason("reason").notNull(),
    details: text("details"),
    status: reportStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    resolutionNote: text("resolution_note"),
  },
  (table) => [
    // Exatamente um alvo por denúncia.
    check(
      "reports_single_target",
      sql`(
        (CASE WHEN ${table.listingId} IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN ${table.reviewId} IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN ${table.conversationId} IS NULL THEN 0 ELSE 1 END)
      ) = 1`,
    ),
    check("reports_details_length", sql`char_length(${table.details}) <= 1000`),
    // Uma denúncia por pessoa em cada alvo. Como o Postgres não considera dois
    // NULLs iguais, cada restrição só vale para as linhas daquele tipo de alvo.
    unique("reports_reporter_listing_key").on(table.reporterId, table.listingId),
    unique("reports_reporter_review_key").on(table.reporterId, table.reviewId),
    unique("reports_reporter_conversation_key").on(table.reporterId, table.conversationId),
    index("reports_status_idx").on(table.status, table.createdAt),
  ],
);

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(user, { fields: [reports.reporterId], references: [user.id] }),
  listing: one(listings, { fields: [reports.listingId], references: [listings.id] }),
  review: one(reviews, { fields: [reports.reviewId], references: [reviews.id] }),
  conversation: one(conversations, {
    fields: [reports.conversationId],
    references: [conversations.id],
  }),
}));
