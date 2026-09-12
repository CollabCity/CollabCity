import { CalendarIcon, EyeIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { FavoriteButton } from "@/components/favorite-button";
import { ReportDialog } from "@/components/report-dialog";
import { SafetyNotice } from "@/components/safety-notice";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSession } from "@/lib/session";
import { EXCHANGE_LABELS, INTENT_LABELS, intentVariant, RESOURCE_LABELS } from "@/lib/taxonomy";
import { formatDistance, formatPrice, initials } from "@/lib/utils";
import { getListingById, getNearbyListings } from "@/server/queries/listings";
import { hasReported } from "@/server/queries/reports";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return { title: "Anúncio não encontrado" };

  return {
    title: listing.title,
    description: listing.description.slice(0, 160),
    openGraph: { title: listing.title, description: listing.description.slice(0, 160) },
  };
}

export default async function ListingPage({ params }: PageProps) {
  const { id } = await params;
  const [listing, session] = await Promise.all([getListingById(id), getSession()]);

  if (!listing) notFound();

  const nearby = await getNearbyListings(listing.id);
  const isAuthor = session?.user.id === listing.authorId;
  const reported =
    session && !isAuthor ? await hasReported(session.user.id, "listing", listing.id) : false;
  const price = listing.exchange === "paid" ? formatPrice(listing.priceCents) : null;

  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <article className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={intentVariant(listing.intent)}>{INTENT_LABELS[listing.intent]}</Badge>
          <Badge variant="outline">{RESOURCE_LABELS[listing.resourceType]}</Badge>
          <Badge variant="neutral">{price ?? EXCHANGE_LABELS[listing.exchange]}</Badge>
          <Badge variant="outline">
            <Link href={`/anuncios?category=${listing.categorySlug}`}>{listing.categoryName}</Link>
          </Badge>
        </div>

        <h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
          {listing.title}
        </h1>

        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground text-sm">
          <div className="inline-flex items-center gap-1.5">
            <MapPinIcon className="size-4" aria-hidden />
            <dt className="sr-only">Localização</dt>
            <dd>
              {listing.city}
              {listing.state ? `, ${listing.state}` : ""}
            </dd>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <CalendarIcon className="size-4" aria-hidden />
            <dt className="sr-only">Publicado em</dt>
            <dd>
              <time dateTime={listing.createdAt.toISOString()}>
                {listing.createdAt.toLocaleDateString("pt-BR")}
              </time>
            </dd>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <EyeIcon className="size-4" aria-hidden />
            <dt className="sr-only">Visualizações</dt>
            <dd>{listing.viewCount}</dd>
          </div>
        </dl>

        {listing.images.length > 0 && (
          <ul
            className={
              listing.images.length === 1 ? "grid gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-3"
            }
          >
            {listing.images.map((image, index) => (
              <li
                key={image.id}
                className={
                  listing.images.length > 1 && index === 0
                    ? "col-span-2 row-span-2 sm:col-span-2"
                    : undefined
                }
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
                  <Image
                    src={image.url}
                    alt={image.alt ?? ""}
                    fill
                    sizes="(min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <Separator />

        <div className="whitespace-pre-wrap text-pretty leading-relaxed">{listing.description}</div>

        {nearby.length > 0 && (
          <section className="pt-6">
            <h2 className="font-semibold text-xl tracking-tight">Por perto</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {nearby.map((item) => (
                <li key={item.id}>
                  <Card>
                    <CardContent className="p-4">
                      <Link href={`/anuncios/${item.id}`} className="font-medium hover:underline">
                        {item.title}
                      </Link>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {item.city} · {formatDistance(item.distanceMeters)}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Avatar className="size-11">
                {listing.authorImage && <AvatarImage src={listing.authorImage} alt="" />}
                <AvatarFallback>{initials(listing.authorName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  <Link href={`/membros/${listing.authorId}`} className="hover:underline">
                    {listing.authorName}
                  </Link>
                </p>
                <p className="text-muted-foreground text-xs">Ver perfil e avaliações</p>
              </div>
            </div>

            <Separator />

            {isAuthor ? (
              <div className="grid gap-2">
                <Button asChild>
                  <Link href={`/anuncios/${listing.id}/editar`}>Editar anúncio</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/painel">Gerenciar no painel</Link>
                </Button>
              </div>
            ) : session ? (
              <ContactForm listingId={listing.id} />
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Entre na sua conta para responder a este anúncio.
                </p>
                <Button asChild className="w-full">
                  <Link href="/entrar">Entrar</Link>
                </Button>
              </div>
            )}

            {session && !isAuthor && <FavoriteButton listingId={listing.id} />}
          </CardContent>
        </Card>

        {!isAuthor && <SafetyNotice context="listing" />}

        {session && !isAuthor && (
          <ReportDialog
            target="listing"
            targetId={listing.id}
            alreadyReported={reported}
            className="w-full"
          />
        )}
      </aside>
    </div>
  );
}
