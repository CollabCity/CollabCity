import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accountDeletions,
  categories,
  conversations,
  listingImages,
  listings,
  messages,
  profiles,
  suspensions,
  user,
} from "@/db/schema";
import type { ResponseStats } from "@/lib/reputation";
import type { ListingCard } from "@/server/queries/listings";

/**
 * Perfil visível para qualquer pessoa, inclusive deslogada.
 *
 * A lista de colunas é a fronteira de privacidade e por isso é explícita:
 * `email`, `latitude`, `longitude` e `search_radius_meters` existem na mesma
 * junção e **não** são selecionados. As coordenadas ficam de fora porque a
 * interface promete cidade e estado; devolvê-las daria a posição de casa de
 * quem preencheu o perfil.
 */
export async function getPublicProfile(userId: string) {
  const [row] = await db
    .select({
      userId: user.id,
      name: user.name,
      image: user.image,
      memberSince: user.createdAt,
      headline: profiles.headline,
      bio: profiles.bio,
      city: profiles.city,
      state: profiles.state,
      website: profiles.website,
    })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);

  return row ?? null;
}

/**
 * Com que frequência, e em quanto tempo, o membro responde a quem o procura.
 *
 * Conta apenas as conversas em que ele é o dono do anúncio — ou seja, aquelas
 * que ele recebeu, não as que iniciou. A primeira resposta é a mensagem mais
 * antiga da conversa enviada por ele; conversas sem nenhuma ficam com
 * `replied_at` nulo, entram no denominador da taxa e são ignoradas pela
 * mediana, que despreza nulos.
 */
export async function getResponseStats(userId: string): Promise<ResponseStats> {
  const firstReply = db
    .select({
      startedAt: conversations.createdAt,
      repliedAt: sql<Date | null>`
        MIN(${messages.createdAt}) FILTER (WHERE ${messages.senderId} = ${conversations.ownerId})
      `.as("replied_at"),
    })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(eq(conversations.ownerId, userId))
    .groupBy(conversations.id)
    .as("first_reply");

  const [row] = await db
    .select({
      received: sql<number>`count(*)::int`,
      answered: sql<number>`count(${firstReply.repliedAt})::int`,
      // `EXTRACT` devolve `numeric` no PostgreSQL 14 em diante, e o driver
      // entregaria uma string; o cast mantém o campo numérico em TypeScript.
      medianSeconds: sql<number | null>`
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (${firstReply.repliedAt} - ${firstReply.startedAt}))::double precision
        )
      `,
    })
    .from(firstReply);

  return row ?? { received: 0, answered: 0, medianSeconds: null };
}

/**
 * Anúncios que o membro mantém abertos.
 *
 * Só `open`: rascunhos e arquivados são material de trabalho do autor, e
 * `fulfilled` hoje é marcado por ele mesmo, sem confirmação da outra parte —
 * não serve como sinal público. A forma do retorno acompanha `ListingCard`
 * para reaproveitar o cartão da busca, com `distanceMeters` nulo porque esta
 * página não tem ponto de origem.
 */
export async function getOpenListingsByAuthor(
  authorId: string,
  limit = 12,
): Promise<ListingCard[]> {
  const coverImage = sql<string | null>`(
    SELECT ${listingImages.url}
    FROM ${listingImages}
    WHERE ${listingImages.listingId} = ${listings.id}
    ORDER BY ${listingImages.sortOrder}
    LIMIT 1
  )`;

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
      distanceMeters: sql<number | null>`NULL::double precision`,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(user, eq(user.id, listings.authorId))
    .where(
      and(
        eq(listings.authorId, authorId),
        eq(listings.status, "open"),
        // Mesma regra da busca: conta suspensa ou em exclusão não mostra anúncio.
        sql`NOT EXISTS (
          SELECT 1 FROM ${suspensions}
          WHERE ${suspensions.userId} = ${listings.authorId}
            AND ${suspensions.liftedAt} IS NULL
        ) AND NOT EXISTS (
          SELECT 1 FROM ${accountDeletions}
          WHERE ${accountDeletions.userId} = ${listings.authorId}
            AND ${accountDeletions.cancelledAt} IS NULL
            AND ${accountDeletions.completedAt} IS NULL
        )`,
      ),
    )
    .orderBy(desc(listings.createdAt))
    .limit(limit);

  return rows as ListingCard[];
}
