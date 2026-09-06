import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, listings, messages, reviews, user } from "@/db/schema";
import { REVIEW_BLIND_DAYS } from "@/lib/reputation";

/**
 * Uma avaliação só é pública quando a outra parte também avaliou, ou quando o
 * prazo às cegas expirou — e nunca quando a moderação a ocultou.
 *
 * A regra é resolvida em SQL, na leitura, e não por uma tarefa que "publica"
 * avaliações no vencimento: sem processo agendado não há o que falhar em
 * silêncio, e o resultado é o mesmo. O custo é repetir este predicado em toda
 * consulta que exponha avaliação — por isso ele mora aqui, em um lugar só.
 */
function isPublished() {
  // A tabela interna é nomeada em texto puro: as referências `${reviews.x}` do
  // Drizzle se qualificam como `"reviews"."x"` e apontam para a linha externa,
  // que é justamente o que a correlação precisa. O intervalo vai por parâmetro,
  // via `make_interval`, em vez de ser concatenado na string.
  return sql`(
    ${reviews.hiddenAt} IS NULL
    AND (
    EXISTS (
      SELECT 1 FROM reviews AS outra
      WHERE outra.conversation_id = ${reviews.conversationId}
        AND outra.author_id <> ${reviews.authorId}
    )
    OR ${reviews.createdAt} + make_interval(days => ${REVIEW_BLIND_DAYS}) <= now()
    )
  )`;
}

export type ReviewSummary = {
  average: number | null;
  count: number;
};

/** Média e total das avaliações públicas recebidas por um membro. */
export async function getReviewSummary(subjectId: string): Promise<ReviewSummary> {
  const [row] = await db
    .select({
      average: sql<number | null>`avg(${reviews.rating})::double precision`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(and(eq(reviews.subjectId, subjectId), isPublished()));

  return row ?? { average: null, count: 0 };
}

/** Avaliações públicas recebidas, da mais recente para a mais antiga. */
export async function getPublishedReviews(subjectId: string, limit = 20) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      authorId: reviews.authorId,
      authorName: user.name,
      authorImage: user.image,
      listingTitle: listings.title,
    })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.authorId))
    .innerJoin(conversations, eq(conversations.id, reviews.conversationId))
    .leftJoin(listings, eq(listings.id, conversations.listingId))
    .where(and(eq(reviews.subjectId, subjectId), isPublished()))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export type ReviewContext = {
  counterpartId: string;
  counterpartName: string;
  /** As duas pessoas enviaram ao menos uma mensagem nesta conversa. */
  bothSpoke: boolean;
  /** A avaliação que o próprio usuário já escreveu, se houver. */
  ownReview: { rating: number; comment: string | null } | null;
  /** A outra parte já avaliou — o que torna as duas avaliações visíveis. */
  counterpartReviewed: boolean;
};

/**
 * O que a pessoa pode fazer quanto a avaliar dentro de uma conversa.
 *
 * Devolve `null` quando a conversa não existe **ou** não é dela: a mesma
 * resposta para os dois casos, pelo mesmo motivo do resto do sistema — separar
 * revelaria quais identificadores existem.
 *
 * `bothSpoke` é o que a plataforma consegue afirmar sobre "ter feito negócio":
 * as duas pessoas se falaram. Uma conversa em que só o interessado escreveu, e
 * ninguém respondeu, não vira avaliação — quem some já aparece na taxa de
 * resposta do perfil, e permitir nota ali transformaria a avaliação em punição
 * por silêncio.
 */
export async function getReviewContext(
  conversationId: string,
  userId: string,
): Promise<ReviewContext | null> {
  const [conversation] = await db
    .select({
      id: conversations.id,
      ownerId: conversations.ownerId,
      requesterId: conversations.requesterId,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation) return null;
  if (conversation.ownerId !== userId && conversation.requesterId !== userId) return null;

  const counterpartId =
    conversation.ownerId === userId ? conversation.requesterId : conversation.ownerId;

  const [counterpart] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, counterpartId))
    .limit(1);

  const [speakers] = await db
    .select({
      distinctSenders: sql<number>`count(DISTINCT ${messages.senderId})::int`,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));

  const written = await db
    .select({
      authorId: reviews.authorId,
      rating: reviews.rating,
      comment: reviews.comment,
    })
    .from(reviews)
    .where(eq(reviews.conversationId, conversationId));

  const own = written.find((review) => review.authorId === userId);

  return {
    counterpartId,
    counterpartName: counterpart?.name ?? "Membro",
    bothSpoke: (speakers?.distinctSenders ?? 0) >= 2,
    ownReview: own ? { rating: own.rating, comment: own.comment } : null,
    counterpartReviewed: written.some((review) => review.authorId === counterpartId),
  };
}
