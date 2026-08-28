import { relations, sql } from "drizzle-orm";
import { doublePrecision, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { geographyPoint } from "./columns";

/**
 * Dados públicos de um membro. Fica separado de `user` porque aquela tabela é
 * gerenciada pelo Better Auth e pode mudar entre versões da biblioteca.
 */
export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    headline: text("headline"),
    bio: text("bio"),
    city: text("city"),
    state: text("state"),
    country: text("country").notNull().default("BR"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    location: geographyPoint("location").generatedAlwaysAs(
      sql`ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`,
    ),
    /** Raio padrão usado nas buscas do membro, em metros. */
    searchRadiusMeters: integer("search_radius_meters").notNull().default(25_000),
    website: text("website"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("profiles_location_idx").using("gist", table.location)],
);

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(user, { fields: [profiles.userId], references: [user.id] }),
}));
