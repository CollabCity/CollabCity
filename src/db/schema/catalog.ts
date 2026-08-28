import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

/** Categorias curadas usadas para filtrar anúncios. */
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  /** Nome de um ícone da biblioteca lucide-react. */
  icon: text("icon").notNull().default("tag"),
  sortOrder: integer("sort_order").notNull().default(0),
});
