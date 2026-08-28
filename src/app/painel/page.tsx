import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ListingRowActions } from "@/components/listing-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { INTENT_SHORT, intentVariant, STATUS_LABELS } from "@/lib/taxonomy";
import { getListingsByAuthor } from "@/server/queries/listings";

export const metadata: Metadata = { title: "Meus anúncios" };

export default async function DashboardPage() {
  const session = await requireSession();
  const listings = await getListingsByAuthor(session.user.id);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Meus anúncios</h1>
          <p className="text-muted-foreground text-sm">
            {listings.length} {listings.length === 1 ? "anúncio" : "anúncios"} publicados.
          </p>
        </div>
        <Button asChild>
          <Link href="/anuncios/novo">Publicar anúncio</Link>
        </Button>
      </header>

      {listings.length === 0 ? (
        <EmptyState
          title="Você ainda não publicou nada"
          description="Comece contando o que você precisa ou o que pode oferecer para a sua comunidade."
          action={
            <Button asChild>
              <Link href="/anuncios/novo">Publicar meu primeiro anúncio</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={intentVariant(listing.intent)}>
                        {INTENT_SHORT[listing.intent]}
                      </Badge>
                      <Badge variant={listing.status === "open" ? "success" : "neutral"}>
                        {STATUS_LABELS[listing.status]}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{listing.categoryName}</span>
                    </div>
                    <Link
                      href={`/anuncios/${listing.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {listing.city} · {listing.viewCount} visualizações ·{" "}
                      <time dateTime={listing.createdAt.toISOString()}>
                        {listing.createdAt.toLocaleDateString("pt-BR")}
                      </time>
                    </p>
                  </div>

                  <ListingRowActions listingId={listing.id} status={listing.status} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
