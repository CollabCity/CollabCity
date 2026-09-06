import { relations, sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Histórico de suspensões de uma conta.
 *
 * É histórico, e não um sinalizador em `user`, por três motivos: `user` é
 * gerenciada pelo Better Auth; uma coluna booleana apagaria o motivo e a data
 * assim que a conta fosse reativada; e uma conta pode ser suspensa mais de uma
 * vez, o que importa justamente para quem decide a próxima.
 *
 * **Uma suspensão está em vigor quando `lifted_at` é nulo.** É essa a condição
 * que `activeSuspension` consulta e que o índice parcial abaixo atende.
 */
export const suspensions = pgTable(
  "suspensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Quem suspendeu. Preservado mesmo se a conta do admin sumir. */
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    liftedAt: timestamp("lifted_at", { withTimezone: true }),
    liftedBy: text("lifted_by").references(() => user.id, { onDelete: "set null" }),
    liftReason: text("lift_reason"),
  },
  (table) => [
    index("suspensions_user_idx").on(table.userId, table.createdAt.desc()),
    // Índice parcial: no máximo uma suspensão em vigor por conta. Sem ele, dois
    // admins agindo ao mesmo tempo deixariam duas linhas ativas, e reativar
    // resolveria só uma delas.
    uniqueIndex("suspensions_active_key").on(table.userId).where(sql`lifted_at IS NULL`),
  ],
);

export const suspensionsRelations = relations(suspensions, ({ one }) => ({
  user: one(user, { fields: [suspensions.userId], references: [user.id] }),
}));
