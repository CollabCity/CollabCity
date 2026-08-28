import { MapPinIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EXCHANGE_LABELS, INTENT_SHORT, intentVariant, RESOURCE_LABELS } from "@/lib/taxonomy";
import { formatDistance, formatPrice } from "@/lib/utils";
import type { ListingCard as ListingCardData } from "@/server/queries/listings";

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const distance = formatDistance(listing.distanceMeters);
  const price = listing.exchange === "paid" ? formatPrice(listing.priceCents) : null;

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      {listing.coverImage && (
        <div className="relative aspect-[16/9] w-full bg-muted">
          <Image
            src={listing.coverImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={intentVariant(listing.intent)}>{INTENT_SHORT[listing.intent]}</Badge>
          <Badge variant="outline">{RESOURCE_LABELS[listing.resourceType]}</Badge>
          <Badge variant="neutral">{price ?? EXCHANGE_LABELS[listing.exchange]}</Badge>
        </div>

        <h3 className="font-semibold leading-snug">
          {/* O link cobre o cartão inteiro para ampliar a área de clique sem
              aninhar elementos interativos. */}
          <Link href={`/anuncios/${listing.id}`} className="after:absolute after:inset-0">
            {listing.title}
          </Link>
        </h3>

        <p className="line-clamp-3 text-muted-foreground text-sm">{listing.description}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="size-3.5" aria-hidden />
            {listing.city}
            {listing.state ? `, ${listing.state}` : ""}
          </span>
          {distance && <span>{distance}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
