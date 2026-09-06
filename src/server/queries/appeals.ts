import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { appeals, listings, reports, reviews, suspensions, user } from "@/db/schema";
import type { AppealStatus } from "@/lib/types";

/**
 * Decisões da moderação que recaem sobre um membro e ainda podem ser
 * contestadas.
 *
 * Só denúncias **acolhidas** entram, e só as que têm consequência reversível:
 * anúncio arquivado e avaliação ocultada. Denúncia de conversa fica de fora
 * porque não houve remoção de conteúdo — não há o que desfazer.
 */
export async function getDecisionsAbout(userId: string) {
  const ownAppeal = sql<string | null>`(
    SELECT ${appeals.status} FROM ${appeals}
    WHERE ${appeals.reportId} = ${reports.id} AND ${appeals.authorId} = ${userId}
  )`;

  return db
    .select({
      reportId: reports.id,
      reason: reports.reason,
      resolvedAt: reports.resolvedAt,
      resolutionNote: reports.resolutionNote,
      listingId: reports.listingId,
      listingTitle: listings.title,
      reviewId: reports.reviewId,
      reviewComment: reviews.comment,
      appealStatus: ownAppeal,
    })
    .from(reports)
    .leftJoin(listings, eq(listings.id, reports.listingId))
    .leftJoin(reviews, eq(reviews.id, reports.reviewId))
    .where(
      and(
        eq(reports.status, "upheld"),
        or(eq(listings.authorId, userId), eq(reviews.authorId, userId)),
      ),
    )
    .orderBy(desc(reports.resolvedAt))
    .limit(50);
}

/** A contestação que o membro já escreveu sobre a suspensão em vigor, se houver. */
export async function getSuspensionAppeal(suspensionId: string, userId: string) {
  const [row] = await db
    .select({
      id: appeals.id,
      status: appeals.status,
      body: appeals.body,
      createdAt: appeals.createdAt,
      resolutionNote: appeals.resolutionNote,
    })
    .from(appeals)
    .where(and(eq(appeals.suspensionId, suspensionId), eq(appeals.authorId, userId)))
    .limit(1);

  return row ?? null;
}

/**
 * A fila de contestações, das mais antigas primeiro — mesma razão da fila de
 * denúncias: ordenar pelas recentes deixaria as antigas envelhecerem no fundo.
 *
 * `originalDecider` é quem tomou a decisão contestada. A tela usa esse campo
 * para impedir que a mesma pessoa julgue o próprio recurso.
 */
export async function getAppeals(status: AppealStatus = "open") {
  const originalDecider = sql<string | null>`
    CASE
      WHEN ${appeals.suspensionId} IS NOT NULL THEN ${suspensions.createdBy}
      ELSE ${reports.resolvedBy}
    END
  `;

  return db
    .select({
      id: appeals.id,
      body: appeals.body,
      status: appeals.status,
      createdAt: appeals.createdAt,
      resolvedAt: appeals.resolvedAt,
      resolutionNote: appeals.resolutionNote,
      authorId: appeals.authorId,
      authorName: user.name,
      suspensionId: appeals.suspensionId,
      suspensionReason: suspensions.reason,
      suspensionLiftedAt: suspensions.liftedAt,
      reportId: appeals.reportId,
      reportNote: reports.resolutionNote,
      reportListingId: reports.listingId,
      reportReviewId: reports.reviewId,
      originalDecider,
    })
    .from(appeals)
    .innerJoin(user, eq(user.id, appeals.authorId))
    .leftJoin(suspensions, eq(suspensions.id, appeals.suspensionId))
    .leftJoin(reports, eq(reports.id, appeals.reportId))
    .where(eq(appeals.status, status))
    .orderBy(status === "open" ? asc(appeals.createdAt) : desc(appeals.resolvedAt))
    .limit(100);
}

/** Quantas contestações há em cada situação, para o rótulo das abas. */
export async function getAppealCounts() {
  const [row] = await db
    .select({
      open: sql<number>`count(*) FILTER (WHERE ${appeals.status} = 'open')::int`,
      accepted: sql<number>`count(*) FILTER (WHERE ${appeals.status} = 'accepted')::int`,
      rejected: sql<number>`count(*) FILTER (WHERE ${appeals.status} = 'rejected')::int`,
    })
    .from(appeals);

  return row ?? { open: 0, accepted: 0, rejected: 0 };
}

/** Contestações em aberto sobre suspensões ainda em vigor. */
export async function countOpenAppeals(): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(appeals)
    .where(and(eq(appeals.status, "open"), isNull(appeals.resolvedAt)));

  return row?.total ?? 0;
}
