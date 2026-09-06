import { relations, sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Pedido de exclusão de conta, com prazo de arrependimento.
 *
 * A exclusão deixou de ser imediata: o pedido marca uma data, o conteúdo da
 * pessoa sai do ar na hora, e o expurgo acontece quando o prazo vence. Até lá,
 * ela pode entrar e cancelar.
 *
 * **Um pedido em aberto por conta**, garantido pelo índice parcial: nem
 * cancelado, nem concluído. Sem ele, dois envios seguidos criariam duas datas e
 * cancelar resolveria só uma.
 */
export const accountDeletions = pgTable(
  "account_deletions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    /** Quando o expurgo pode acontecer. */
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("account_deletions_pending_key")
      .on(table.userId)
      .where(sql`cancelled_at IS NULL AND completed_at IS NULL`),
    // Atende a varredura do expurgo: pendentes, por data de vencimento.
    index("account_deletions_due_idx").on(table.scheduledFor),
  ],
);

export const accountDeletionsRelations = relations(accountDeletions, ({ one }) => ({
  user: one(user, { fields: [accountDeletions.userId], references: [user.id] }),
}));
