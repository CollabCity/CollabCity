import { relations, sql } from "drizzle-orm";
import {
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { categories } from "./catalog";
import { geographyPoint, tsvector } from "./columns";
import { exchangeMode, listingIntent, listingStatus, resourceType } from "./enums";

/** Um pedido ou oferta publicado por um membro. */
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    intent: listingIntent("intent").notNull(),
    resourceType: resourceType("resource_type").notNull(),
    exchange: exchangeMode("exchange").notNull().default("free"),
    /** Preço em centavos. Só é preenchido quando `exchange` é `paid`. */
    priceCents: integer("price_cents"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    city: text("city").notNull(),
    state: text("state"),
    country: text("country").notNull().default("BR"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    location: geographyPoint("location").generatedAlwaysAs(
      sql`ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`,
    ),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, ''))`,
    ),
    status: listingStatus("status").notNull().default("open"),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("listings_location_idx").using("gist", table.location),
    index("listings_search_idx").using("gin", table.searchVector),
    index("listings_author_idx").on(table.authorId),
    index("listings_category_idx").on(table.categoryId),
    index("listings_status_created_idx").on(table.status, table.createdAt.desc()),
  ],
);

/** Fotos anexadas a um anúncio. */
export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /**
     * Caminho do arquivo dentro do armazenamento.
     *
     * Guardado à parte da `url` porque é ele que permite apagar o objeto: a URL
     * pública pode ter prefixo de CDN ou domínio próprio, e derivar a chave dela
     * quebraria assim que esse endereço mudasse.
     */
    storageKey: text("storage_key"),
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("listing_images_listing_idx").on(table.listingId, table.sortOrder)],
);

/** Anúncios salvos por um membro. */
export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.listingId] }),
    index("favorites_listing_idx").on(table.listingId),
  ],
);

export const listingsRelations = relations(listings, ({ one, many }) => ({
  author: one(user, { fields: [listings.authorId], references: [user.id] }),
  category: one(categories, { fields: [listings.categoryId], references: [categories.id] }),
  images: many(listingImages),
  favorites: many(favorites),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, { fields: [listingImages.listingId], references: [listings.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  listing: one(listings, { fields: [favorites.listingId], references: [listings.id] }),
  user: one(user, { fields: [favorites.userId], references: [user.id] }),
}));
