import { CalendarIcon, GlobeIcon, MapPinIcon, MessageCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/listing-card";
import { RatingStars } from "@/components/rating-stars";
import { ReviewList } from "@/components/review-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatMemberSince,
  formatRating,
  formatResponseTime,
  formatReviewCount,
  isNewMember,
  responseRate,
} from "@/lib/reputation";
import { getSession } from "@/lib/session";
import { initials } from "@/lib/utils";
import {
  getOpenListingsByAuthor,
  getPublicProfile,
  getResponseStats,
} from "@/server/queries/profiles";
import { getReportedReviewIds } from "@/server/queries/reports";
import { getPublishedReviews, getReviewSummary } from "@/server/queries/reviews";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) return { title: "Membro não encontrado" };

  return {
    title: profile.name,
    description: profile.headline ?? `Anúncios e avaliações de ${profile.name} no CollabCity.`,
  };
}

export default async function MemberPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) notFound();

  const [listings, responses, summary, reviews, session] = await Promise.all([
    getOpenListingsByAuthor(id),
    getResponseStats(id),
    getReviewSummary(id),
    getPublishedReviews(id),
    getSession(),
  ]);

  const reportedIds = session
    ? await getReportedReviewIds(
        session.user.id,
        reviews.map((review) => review.id),
      )
    : undefined;

  const rate = responseRate(responses);
  const responseTime = formatResponseTime(responses.medianSeconds);
  const average = formatRating(summary.average);
  const location = [profile.city, profile.state].filter(Boolean).join(", ");

  return (
    <div className="container-page max-w-4xl space-y-10 py-10">
      <header className="flex flex-wrap items-start gap-5">
        <Avatar className="size-20">
          {profile.image && <AvatarImage src={profile.image} alt="" />}
          <AvatarFallback className="text-xl">{initials(profile.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-semibold text-3xl tracking-tight">{profile.name}</h1>
            {isNewMember(profile.memberSince) && <Badge variant="neutral">Novo por aqui</Badge>}
          </div>

          {profile.headline && <p className="text-muted-foreground">{profile.headline}</p>}

          <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-muted-foreground text-sm">
            {location && (
              <div className="inline-flex items-center gap-1.5">
                <MapPinIcon className="size-4" aria-hidden />
                <dt className="sr-only">Localização</dt>
                <dd>{location}</dd>
              </div>
            )}
            <div className="inline-flex items-center gap-1.5">
              <CalendarIcon className="size-4" aria-hidden />
              <dt className="sr-only">Membro</dt>
              <dd>
                <time dateTime={profile.memberSince.toISOString()}>
                  {formatMemberSince(profile.memberSince)}
                </time>
              </dd>
            </div>
            {profile.website && (
              <div className="inline-flex items-center gap-1.5">
                <GlobeIcon className="size-4" aria-hidden />
                <dt className="sr-only">Site</dt>
                <dd>
                  {/* `noopener` e `nofollow` porque a URL é escrita pelo próprio
                      membro: o link não empresta reputação do domínio nem dá
                      acesso à janela de origem. */}
                  <a
                    href={profile.website}
                    rel="noopener noreferrer nofollow"
                    target="_blank"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-6 p-6 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Avaliações</p>
            {average ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RatingStars value={summary.average ?? 0} />
                  <span className="font-semibold text-lg">{average}</span>
                </div>
                <p className="text-muted-foreground text-sm">{formatReviewCount(summary.count)}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Ainda não recebeu avaliações.</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Resposta</p>
            {rate === null ? (
              <p className="text-muted-foreground text-sm">
                Ainda são poucas conversas para dizer algo sobre resposta.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold text-lg">{Math.round(rate * 100)}%</p>
                <p className="text-muted-foreground text-sm">
                  das conversas respondidas{responseTime ? `, ${responseTime}` : ""}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Anúncios</p>
            <p className="font-semibold text-lg">{listings.length}</p>
            <p className="text-muted-foreground text-sm">
              {listings.length === 1 ? "anúncio aberto" : "anúncios abertos"}
            </p>
          </div>
        </CardContent>
      </Card>

      {profile.bio && (
        <section className="space-y-3">
          <h2 className="font-semibold text-xl tracking-tight">Sobre</h2>
          <p className="whitespace-pre-wrap text-pretty leading-relaxed">{profile.bio}</p>
        </section>
      )}

      <Separator />

      <section className="space-y-4">
        <h2 className="font-semibold text-xl tracking-tight">Anúncios abertos</h2>
        {listings.length === 0 ? (
          <p className="text-muted-foreground">
            {profile.name} não tem anúncios abertos no momento.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => (
              <li key={listing.id} className="relative">
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-semibold text-xl tracking-tight">
          O que dizem sobre {profile.name.split(" ")[0]}
        </h2>
        {reviews.length === 0 ? (
          <div className="flex gap-2.5 text-muted-foreground">
            <MessageCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="text-sm leading-relaxed">
              Nenhuma avaliação publicada ainda. Só quem trocou mensagens com {profile.name} em uma
              conversa pode avaliar, e a avaliação aparece quando as duas partes avaliam.
            </p>
          </div>
        ) : (
          <ReviewList reviews={reviews} viewerId={session?.user.id} reportedIds={reportedIds} />
        )}
      </section>
    </div>
  );
}
