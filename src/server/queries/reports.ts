import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  conversations,
  listings,
  messages,
  moderators,
  reports,
  reviews,
  suspensions,
  user,
} from "@/db/schema";
import type { ReportStatus, ReportTarget } from "@/lib/types";

/** Papel do membro na equipe, ou `null` para quem não é da equipe. */
export async function staffRoleOf(userId: string): Promise<"moderator" | "admin" | null> {
  const [row] = await db
    .select({ role: moderators.role })
    .from(moderators)
    .where(eq(moderators.userId, userId))
    .limit(1);

  return row?.role ?? null;
}

/** Um membro é moderador se tem linha em `moderators` — admin incluído. */
export async function isModerator(userId: string): Promise<boolean> {
  return (await staffRoleOf(userId)) !== null;
}

/** Só admin suspende e reativa contas. */
export async function isAdmin(userId: string): Promise<boolean> {
  return (await staffRoleOf(userId)) === "admin";
}

/**
 * A suspensão em vigor de uma conta, se houver.
 *
 * "Em vigor" é `lifted_at IS NULL`, a mesma condição do índice parcial
 * `suspensions_active_key` — que garante no máximo uma.
 */
export async function activeSuspension(userId: string) {
  const [row] = await db
    .select({
      id: suspensions.id,
      reason: suspensions.reason,
      createdAt: suspensions.createdAt,
    })
    .from(suspensions)
    .where(and(eq(suspensions.userId, userId), isNull(suspensions.liftedAt)))
    .limit(1);

  return row ?? null;
}

/** Contas suspensas agora, para a tela de administração. */
export async function getActiveSuspensions() {
  return db
    .select({
      id: suspensions.id,
      userId: suspensions.userId,
      userName: user.name,
      reason: suspensions.reason,
      createdAt: suspensions.createdAt,
    })
    .from(suspensions)
    .innerJoin(user, eq(user.id, suspensions.userId))
    .where(isNull(suspensions.liftedAt))
    .orderBy(desc(suspensions.createdAt))
    .limit(100);
}

/** Qual coluna de alvo está preenchida. O banco garante que é exatamente uma. */
function targetType() {
  return sql<ReportTarget>`
    CASE
      WHEN ${reports.listingId} IS NOT NULL THEN 'listing'
      WHEN ${reports.reviewId} IS NOT NULL THEN 'review'
      ELSE 'conversation'
    END
  `;
}

const reviewSubject = sql<string | null>`(
  SELECT ${user.name} FROM ${user}
  WHERE ${user.id} = (SELECT ${reviews.subjectId} FROM ${reviews} WHERE ${reviews.id} = ${reports.reviewId})
)`;

/**
 * A fila de moderação.
 *
 * As denúncias em aberto vêm da mais antiga para a mais nova, de propósito: uma
 * fila que mostra as recentes primeiro deixa as antigas envelhecerem para
 * sempre no fundo.
 */
export async function getReports(status: ReportStatus = "open") {
  /**
   * De quem é o conteúdo denunciado — quem um admin suspenderia.
   *
   * Em uma conversa não há "dono": o alvo é o outro participante, aquele que
   * não denunciou.
   */
  const targetOwnerId = sql<string | null>`
    CASE
      WHEN ${reports.listingId} IS NOT NULL THEN ${listings.authorId}
      WHEN ${reports.reviewId} IS NOT NULL THEN ${reviews.authorId}
      ELSE (
        SELECT CASE
          WHEN ${conversations.ownerId} = ${reports.reporterId} THEN ${conversations.requesterId}
          ELSE ${conversations.ownerId}
        END
        FROM ${conversations}
        WHERE ${conversations.id} = ${reports.conversationId}
      )
    END
  `;

  const conversationListing = sql<string | null>`(
    SELECT ${listings.title} FROM ${listings}
    WHERE ${listings.id} = (
      SELECT ${conversations.listingId} FROM ${conversations}
      WHERE ${conversations.id} = ${reports.conversationId}
    )
  )`;

  return db
    .select({
      id: reports.id,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      resolutionNote: reports.resolutionNote,
      reporterName: user.name,
      target: targetType(),
      listingId: reports.listingId,
      listingTitle: listings.title,
      listingStatus: listings.status,
      reviewId: reports.reviewId,
      reviewRating: reviews.rating,
      reviewComment: reviews.comment,
      reviewSubject,
      conversationId: reports.conversationId,
      conversationListing,
      targetOwnerId,
      targetOwnerName: sql<
        string | null
      >`(SELECT ${user.name} FROM ${user} WHERE ${user.id} = ${targetOwnerId})`,
    })
    .from(reports)
    .innerJoin(user, eq(user.id, reports.reporterId))
    .leftJoin(listings, eq(listings.id, reports.listingId))
    .leftJoin(reviews, eq(reviews.id, reports.reviewId))
    .where(eq(reports.status, status))
    .orderBy(status === "open" ? asc(reports.createdAt) : desc(reports.resolvedAt))
    .limit(100);
}

/** Quantas denúncias há em cada situação, para o rótulo da aba. */
export async function getReportCounts() {
  const [row] = await db
    .select({
      open: sql<number>`count(*) FILTER (WHERE ${reports.status} = 'open')::int`,
      upheld: sql<number>`count(*) FILTER (WHERE ${reports.status} = 'upheld')::int`,
      dismissed: sql<number>`count(*) FILTER (WHERE ${reports.status} = 'dismissed')::int`,
    })
    .from(reports);

  return row ?? { open: 0, upheld: 0, dismissed: 0 };
}

/**
 * As mensagens de uma conversa denunciada.
 *
 * É o único caminho pelo qual alguém de fora lê uma conversa privada, e ele
 * exige duas condições simultâneas: quem pede é moderador, e existe denúncia
 * apontando **para aquela conversa**. Sem denúncia não há leitura — a
 * moderação não navega pelas conversas da plataforma, ela responde a um pedido
 * de alguém que estava lá dentro.
 */
export async function getReportedConversation(reportId: string, moderatorId: string) {
  if (!(await isModerator(moderatorId))) return null;

  const [report] = await db
    .select({ conversationId: reports.conversationId })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!report?.conversationId) return null;

  return db
    .select({
      id: messages.id,
      body: messages.body,
      createdAt: messages.createdAt,
      senderName: user.name,
    })
    .from(messages)
    .innerJoin(user, eq(user.id, messages.senderId))
    .where(eq(messages.conversationId, report.conversationId))
    .orderBy(asc(messages.createdAt));
}

/** Se o membro já denunciou aquele alvo, para não oferecer o botão de novo. */
export async function hasReported(
  userId: string,
  target: ReportTarget,
  targetId: string,
): Promise<boolean> {
  const column =
    target === "listing"
      ? reports.listingId
      : target === "review"
        ? reports.reviewId
        : reports.conversationId;

  const [row] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.reporterId, userId), eq(column, targetId)))
    .limit(1);

  return row !== undefined;
}

/**
 * Quais avaliações de uma lista o membro já denunciou.
 *
 * Em lote, e não uma consulta por avaliação: o perfil pode exibir vinte de uma
 * vez, e perguntar de uma em uma daria vinte idas ao banco por página.
 */
export async function getReportedReviewIds(
  userId: string,
  reviewIds: string[],
): Promise<Set<string>> {
  if (reviewIds.length === 0) return new Set();

  const rows = await db
    .select({ reviewId: reports.reviewId })
    .from(reports)
    .where(and(eq(reports.reporterId, userId), inArray(reports.reviewId, reviewIds)));

  return new Set(rows.map((row) => row.reviewId).filter((id): id is string => id !== null));
}
