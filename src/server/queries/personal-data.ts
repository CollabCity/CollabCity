import { and, asc, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import {
  appeals,
  conversations,
  favorites,
  listingImages,
  listings,
  messages,
  profiles,
  reports,
  reviews,
  suspensions,
  user,
} from "@/db/schema";

/**
 * Tudo o que a plataforma guarda sobre uma pessoa, para o direito de acesso e
 * portabilidade do art. 18 da LGPD.
 *
 * Três coisas ficam **de fora**, de propósito:
 *
 * - Quem denunciou a pessoa. A denúncia é revelada como decisão sofrida, sem o
 *   nome de quem a fez — caso contrário a exportação viraria um jeito legítimo
 *   de descobrir quem denunciou.
 * - E-mail e contato de terceiros. As outras pessoas aparecem só pelo nome de
 *   exibição, que já é público no perfil delas.
 * - Identificadores internos de terceiros que não sirvam para nada a quem
 *   exporta.
 *
 * As mensagens da outra parte **entram**: a conversa é um documento de duas
 * pontas, e devolver só metade produziria um registro enganoso de algo a que a
 * pessoa já tem acesso na própria tela.
 */
export async function collectPersonalData(userId: string) {
  const [account] = await db
    .select({
      id: user.id,
      nome: user.name,
      email: user.email,
      emailVerificado: user.emailVerified,
      criadaEm: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const [profile] = await db
    .select({
      apresentacao: profiles.headline,
      sobre: profiles.bio,
      cidade: profiles.city,
      estado: profiles.state,
      pais: profiles.country,
      latitude: profiles.latitude,
      longitude: profiles.longitude,
      raioDeBuscaMetros: profiles.searchRadiusMeters,
      site: profiles.website,
      atualizadoEm: profiles.updatedAt,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const anuncios = await db
    .select({
      id: listings.id,
      titulo: listings.title,
      descricao: listings.description,
      intencao: listings.intent,
      natureza: listings.resourceType,
      troca: listings.exchange,
      precoCentavos: listings.priceCents,
      situacao: listings.status,
      cidade: listings.city,
      estado: listings.state,
      latitude: listings.latitude,
      longitude: listings.longitude,
      criadoEm: listings.createdAt,
    })
    .from(listings)
    .where(eq(listings.authorId, userId))
    .orderBy(desc(listings.createdAt));

  const imagens = await db
    .select({ anuncioId: listingImages.listingId, url: listingImages.url })
    .from(listingImages)
    .innerJoin(listings, eq(listings.id, listingImages.listingId))
    .where(eq(listings.authorId, userId));

  const salvos = await db
    .select({ anuncioId: favorites.listingId, salvoEm: favorites.createdAt })
    .from(favorites)
    .where(eq(favorites.userId, userId));

  const conversas = await db
    .select({
      id: conversations.id,
      anuncio: listings.title,
      contraparteId: conversations.ownerId,
      requerenteId: conversations.requesterId,
      criadaEm: conversations.createdAt,
    })
    .from(conversations)
    .leftJoin(listings, eq(listings.id, conversations.listingId))
    .where(or(eq(conversations.ownerId, userId), eq(conversations.requesterId, userId)))
    .orderBy(desc(conversations.createdAt));

  const conversaIds = conversas.map((conversa) => conversa.id);

  const mensagens =
    conversaIds.length === 0
      ? []
      : await db
          .select({
            conversaId: messages.conversationId,
            autor: user.name,
            souEu: messages.senderId,
            texto: messages.body,
            enviadaEm: messages.createdAt,
          })
          .from(messages)
          .innerJoin(user, eq(user.id, messages.senderId))
          .where(or(...conversaIds.map((id) => eq(messages.conversationId, id))))
          .orderBy(asc(messages.createdAt));

  const avaliacoesEscritas = await db
    .select({
      nota: reviews.rating,
      comentario: reviews.comment,
      escritaEm: reviews.createdAt,
      ocultadaEm: reviews.hiddenAt,
    })
    .from(reviews)
    .where(eq(reviews.authorId, userId));

  const avaliacoesRecebidas = await db
    .select({
      nota: reviews.rating,
      comentario: reviews.comment,
      autor: user.name,
      recebidaEm: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.authorId))
    .where(eq(reviews.subjectId, userId));

  const denunciasFeitas = await db
    .select({
      motivo: reports.reason,
      relato: reports.details,
      situacao: reports.status,
      feitaEm: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.reporterId, userId));

  // Denúncias **sobre** a pessoa entram sem o autor: ver o comentário do módulo.
  const decisoesSofridas = await db
    .select({
      motivo: reports.reason,
      situacao: reports.status,
      nota: reports.resolutionNote,
      decididaEm: reports.resolvedAt,
      anuncio: listings.title,
    })
    .from(reports)
    .leftJoin(listings, eq(listings.id, reports.listingId))
    .leftJoin(reviews, eq(reviews.id, reports.reviewId))
    .where(
      and(
        eq(reports.status, "upheld"),
        or(eq(listings.authorId, userId), eq(reviews.authorId, userId)),
      ),
    );

  const suspensoes = await db
    .select({
      motivo: suspensions.reason,
      aplicadaEm: suspensions.createdAt,
      encerradaEm: suspensions.liftedAt,
      notaDeEncerramento: suspensions.liftReason,
    })
    .from(suspensions)
    .where(eq(suspensions.userId, userId));

  const contestacoes = await db
    .select({
      alegacao: appeals.body,
      situacao: appeals.status,
      resposta: appeals.resolutionNote,
      feitaEm: appeals.createdAt,
    })
    .from(appeals)
    .where(eq(appeals.authorId, userId));

  return {
    exportadoEm: new Date().toISOString(),
    conta: account ?? null,
    perfil: profile ?? null,
    anuncios: anuncios.map((anuncio) => ({
      ...anuncio,
      imagens: imagens.filter((imagem) => imagem.anuncioId === anuncio.id).map((i) => i.url),
    })),
    anunciosSalvos: salvos,
    conversas: conversas.map((conversa) => ({
      anuncio: conversa.anuncio ?? "anúncio removido",
      criadaEm: conversa.criadaEm,
      mensagens: mensagens
        .filter((mensagem) => mensagem.conversaId === conversa.id)
        .map((mensagem) => ({
          autor: mensagem.souEu === userId ? "você" : mensagem.autor,
          texto: mensagem.texto,
          enviadaEm: mensagem.enviadaEm,
        })),
    })),
    avaliacoesEscritas,
    avaliacoesRecebidas,
    denunciasFeitas,
    decisoesSofridas,
    suspensoes,
    contestacoes,
  };
}
