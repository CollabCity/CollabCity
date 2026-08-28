import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { EXCHANGE_LABELS, INTENT_SHORT, intentVariant } from "@/lib/taxonomy";
import { formatPrice } from "@/lib/utils";
import { getFavoritesForUser } from "@/server/queries/listings";

export const metadata: Metadata = { title: "Anúncios salvos" };

export default async function SavedPage() {
  const session = await requireSession();
  const saved = await getFavoritesForUser(session.user.id);

  if (saved.length === 0) {
    return (
      <EmptyState
        title="Nenhum anúncio salvo"
        description="Salve anúncios enquanto navega para voltar a eles depois."
        action={
          <Button asChild>
            <Link href="/anuncios">Explorar anúncios</Link>
          </Button>
        }
      />
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="font-semibold text-2xl tracking-tight">Salvos</h1>
      <ul className="grid gap-3">
        {saved.map((listing) => (
          <li key={listing.id}>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={intentVariant(listing.intent)}>
                      {INTENT_SHORT[listing.intent]}
                    </Badge>
                    <Badge variant="neutral">
                      {listing.exchange === "paid"
                        ? formatPrice(listing.priceCents)
                        : EXCHANGE_LABELS[listing.exchange]}
                    </Badge>
                    {listing.status !== "open" && <Badge variant="outline">Encerrado</Badge>}
                  </div>
                  <Link
                    href={`/anuncios/${listing.id}`}
                    className="block font-medium hover:underline"
                  >
                    {listing.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">{listing.city}</p>
                </div>

                <Button variant="outline" size="sm" asChild>
                  <Link href={`/anuncios/${listing.id}`}>Abrir</Link>
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
