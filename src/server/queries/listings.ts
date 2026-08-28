import { and, desc, eq, isNotNull, type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, favorites, listingImages, listings, profiles, user } from "@/db/schema";
import type { SearchParams } from "@/lib/validations/listing";

export const PAGE_SIZE = 12;

/** Ponto de referência da busca, no formato `geography` do PostGIS. */
function originPoint(latitude: number, longitude: number): SQL {
  return sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
}

/** Consulta textual em português. `websearch_to_tsquery` aceita aspas e `-`. */
function textQuery(term: string): SQL {
  return sql`websearch_to_tsquery('portuguese', ${term})`;
}

export type ListingCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  intent: "need" | "offer";
  resourceType: "skill" | "item" | "volunteer";
  exchange: "free" | "trade" | "paid";
  priceCents: number | null;
  city: string;
  state: string | null;
  createdAt: Date;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string;
  authorName: string;
  authorImage: string | null;
  coverImage: string | null;
  distanceMeters: number | null;
};

/**
 * Busca paginada de anúncios.
 *
 * A filtragem por raio usa `ST_DWithin` em vez de comparar `ST_Distance` com um
 * limite: só a primeira forma é resolvida pelo índice GiST `listings_location_idx`.
 * A distância exata continua sendo projetada para exibição e ordenação.
 */
export async function searchListings(params: SearchParams) {
  const hasOrigin = params.latitude !== undefined && params.longitude !== undefined;
  const origin = hasOrigin
    ? originPoint(params.latitude as number, params.longitude as number)
    : null;

  const conditions: SQL[] = [eq(listings.status, "open")];

  if (params.q) conditions.push(sql`${listings.searchVector} @@ ${textQuery(params.q)}`);
  if (params.category) conditions.push(eq(categories.slug, params.category));
  if (params.intent) conditions.push(eq(listings.intent, params.intent));
  if (params.resourceType) conditions.push(eq(listings.resourceType, params.resourceType));
  if (params.exchange) conditions.push(eq(listings.exchange, params.exchange));
  if (origin) {
    conditions.push(sql`ST_DWithin(${listings.location}, ${origin}, ${params.radius})`);
  }

  const distance = origin
    ? sql<number>`ST_Distance(${listings.location}, ${origin})`
    : sql<number | null>`NULL::double precision`;

  const rank = params.q
    ? sql<number>`ts_rank(${listings.searchVector}, ${textQuery(params.q)})`
    : sql<number>`0`;

  const coverImage = sql<string | null>`(
    SELECT ${listingImages.url}
    FROM ${listingImages}
    WHERE ${listingImages.listingId} = ${listings.id}
    ORDER BY ${listingImages.sortOrder}
    LIMIT 1
  )`;

  const where = and(...conditions);

  const orderBy = (() => {
    if (params.sort === "distance" && origin) return [sql`${distance} ASC`];
    if (params.sort === "relevance" && params.q) return [desc(rank), desc(listings.createdAt)];
    return [desc(listings.createdAt)];
  })();

  const offset = (params.page - 1) * PAGE_SIZE;

  const rows = await db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      description: listings.description,
      intent: listings.intent,
      resourceType: listings.resourceType,
      exchange: listings.exchange,
      priceCents: listings.priceCents,
      city: listings.city,
      state: listings.state,
      createdAt: listings.createdAt,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryIcon: categories.icon,
      authorName: user.name,
      authorImage: user.image,
      coverImage,
      distanceMeters: distance,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(user, eq(user.id, listings.authorId))
    .where(where)
    .orderBy(...orderBy)
    .limit(PAGE_SIZE + 1)
    .offset(offset);

  const hasNextPage = rows.length > PAGE_SIZE;

  return {
    items: rows.slice(0, PAGE_SIZE) as ListingCard[],
    page: params.page,
    hasNextPage,
    hasPreviousPage: params.page > 1,
  };
}

/** Anúncio completo, com autor, categoria e imagens. */
export async function getListingById(id: string) {
  const [row] = await db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      description: listings.description,
      intent: listings.intent,
      resourceType: listings.resourceType,
      exchange: listings.exchange,
      priceCents: listings.priceCents,
      status: listings.status,
      city: listings.city,
      state: listings.state,
      country: listings.country,
      latitude: listings.latitude,
      longitude: listings.longitude,
      viewCount: listings.viewCount,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      authorId: listings.authorId,
      authorName: user.name,
      authorImage: user.image,
      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryIcon: categories.icon,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(user, eq(user.id, listings.authorId))
    .where(eq(listings.id, id))
    .limit(1);

  if (!row) return null;

  const images = await db
    .select({ id: listingImages.id, url: listingImages.url, alt: listingImages.alt })
    .from(listingImages)
    .where(eq(listingImages.listingId, id))
    .orderBy(listingImages.sortOrder);

  return { ...row, images };
}

/**
 * Anúncios próximos a um anúncio, excluindo ele mesmo.
 * Usado na página de detalhe para dar continuidade à navegação.
 */
export async function getNearbyListings(listingId: string, limit = 4) {
  const origin = sql`(SELECT ${listings.location} FROM ${listings} WHERE ${listings.id} = ${listingId})`;

  return db
    .select({
      id: listings.id,
      title: listings.title,
      city: listings.city,
      intent: listings.intent,
      exchange: listings.exchange,
      priceCents: listings.priceCents,
      distanceMeters: sql<number>`ST_Distance(${listings.location}, ${origin})`,
    })
    .from(listings)
    .where(
      and(
        eq(listings.status, "open"),
        sql`${listings.id} <> ${listingId}`,
        isNotNull(listings.location),
        sql`ST_DWithin(${listings.location}, ${origin}, 50000)`,
      ),
    )
    .orderBy(sql`ST_Distance(${listings.location}, ${origin}) ASC`)
    .limit(limit);
}

/** Anúncios de um membro, para o painel pessoal. */
export async function getListingsByAuthor(authorId: string) {
  return db
    .select({
      id: listings.id,
      title: listings.title,
      status: listings.status,
      intent: listings.intent,
      city: listings.city,
      viewCount: listings.viewCount,
      createdAt: listings.createdAt,
      categoryName: categories.name,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .where(eq(listings.authorId, authorId))
    .orderBy(desc(listings.createdAt));
}

export async function getCategories() {
  return db.select().from(categories).orderBy(categories.sortOrder, categories.name);
}

/** Contadores exibidos na página inicial. */
export async function getPlatformStats() {
  const [row] = await db
    .select({
      openListings: sql<number>`count(*) FILTER (WHERE ${listings.status} = 'open')::int`,
      offers: sql<number>`count(*) FILTER (WHERE ${listings.intent} = 'offer' AND ${listings.status} = 'open')::int`,
      needs: sql<number>`count(*) FILTER (WHERE ${listings.intent} = 'need' AND ${listings.status} = 'open')::int`,
      cities: sql<number>`count(DISTINCT ${listings.city})::int`,
    })
    .from(listings);

  return row ?? { openListings: 0, offers: 0, needs: 0, cities: 0 };
}

/** Anúncios salvos por um membro. */
export async function getFavoritesForUser(userId: string) {
  return db
    .select({
      id: listings.id,
      title: listings.title,
      city: listings.city,
      intent: listings.intent,
      exchange: listings.exchange,
      priceCents: listings.priceCents,
      status: listings.status,
      savedAt: favorites.createdAt,
    })
    .from(favorites)
    .innerJoin(listings, eq(listings.id, favorites.listingId))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
}

/** Perfil do membro, criado sob demanda na primeira edição. */
export async function getProfile(userId: string) {
  const [row] = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      headline: profiles.headline,
      bio: profiles.bio,
      city: profiles.city,
      state: profiles.state,
      country: profiles.country,
      latitude: profiles.latitude,
      longitude: profiles.longitude,
      searchRadiusMeters: profiles.searchRadiusMeters,
      website: profiles.website,
    })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);

  return row ?? null;
}
