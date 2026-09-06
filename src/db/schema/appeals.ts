import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { appealStatus } from "./enums";
import { reports } from "./reports";
import { suspensions } from "./suspensions";

/**
 * Pedido de revisão de uma decisão da moderação.
 *
 * Existe porque toda decisão aqui é tomada por uma pessoa com informação
 * parcial: quem denunciou contou um lado, e quem moderou decidiu sem ouvir o
 * outro. Sem um caminho de volta, um engano vira permanente — e a plataforma
 * ficava afirmando regras que não dava para questionar.
 *
 * Contesta-se uma **suspensão** ou uma **denúncia acolhida**. Como em `reports`,
 * o alvo são duas chaves estrangeiras e não um par `(tipo, id)`: o banco garante
 * que existe, e a cascata limpa sozinha.
 */
export const appeals = pgTable(
  "appeals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Quem contesta. É sempre quem sofreu a decisão. */
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    suspensionId: uuid("suspension_id").references(() => suspensions.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").references(() => reports.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: appealStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    resolutionNote: text("resolution_note"),
  },
  (table) => [
    check(
      "appeals_single_target",
      sql`(
        (CASE WHEN ${table.suspensionId} IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN ${table.reportId} IS NULL THEN 0 ELSE 1 END)
      ) = 1`,
    ),
    check("appeals_body_length", sql`char_length(${table.body}) BETWEEN 20 AND 2000`),
    // Uma contestação por decisão. Insistir não é recurso novo.
    unique("appeals_author_suspension_key").on(table.authorId, table.suspensionId),
    unique("appeals_author_report_key").on(table.authorId, table.reportId),
    index("appeals_status_idx").on(table.status, table.createdAt),
  ],
);

export const appealsRelations = relations(appeals, ({ one }) => ({
  author: one(user, { fields: [appeals.authorId], references: [user.id] }),
  suspension: one(suspensions, {
    fields: [appeals.suspensionId],
    references: [suspensions.id],
  }),
  report: one(reports, { fields: [appeals.reportId], references: [reports.id] }),
}));
