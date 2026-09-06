"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { reviewSchema } from "@/lib/validations/review";
import { getReviewContext } from "@/server/queries/reviews";
import { pruneRateLimits, rateLimit } from "@/server/rate-limit";
import { type ActionState, errorState, successState } from "./types";

/**
 * Registra a avaliação de uma das partes de uma conversa sobre a outra.
 *
 * A avaliação **não** pode ser editada depois. Poder reescrever seria a porta
 * dos fundos do prazo às cegas: bastaria enviar uma nota qualquer, esperar a
 * avaliação da outra parte aparecer e então ajustar a sua em retaliação.
 */
export async function submitReview(
  conversationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  pruneRateLimits();
  if (!rateLimit(`review:submit:${session.user.id}`, 10, 60 * 60 * 1000)) {
    return errorState("Você enviou muitas avaliações na última hora.");
  }

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return errorState(
      "Confira a nota e o comentário.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const context = await getReviewContext(conversationId, session.user.id);
  if (!context) return errorState("Conversa não encontrada.");

  if (!context.bothSpoke) {
    return errorState("Só é possível avaliar depois que as duas pessoas trocaram mensagens.");
  }

  if (context.ownReview) {
    return errorState("Você já avaliou esta pessoa nesta conversa.");
  }

  // A condição de unicidade está no banco (`reviews_conversation_author_key`).
  // A checagem acima é a mensagem amigável; esta cláusula é o que de fato
  // impede duas avaliações vindas de dois envios simultâneos.
  const inserted = await db
    .insert(reviews)
    .values({
      conversationId,
      authorId: session.user.id,
      subjectId: context.counterpartId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    })
    .onConflictDoNothing({ target: [reviews.conversationId, reviews.authorId] })
    .returning({ id: reviews.id });

  if (inserted.length === 0) {
    return errorState("Você já avaliou esta pessoa nesta conversa.");
  }

  revalidatePath(`/mensagens/${conversationId}`);
  revalidatePath(`/membros/${context.counterpartId}`);

  return successState(
    context.counterpartReviewed
      ? "Avaliação enviada. As duas avaliações já estão visíveis."
      : "Avaliação enviada. Ela aparece quando a outra pessoa avaliar, ou em 14 dias.",
  );
}
