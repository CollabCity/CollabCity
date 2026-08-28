import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingForm } from "@/components/listing-form";
import { requireOwnership } from "@/lib/session";
import { updateListing } from "@/server/actions/listings";
import { getCategories, getListingById } from "@/server/queries/listings";

export const metadata: Metadata = { title: "Editar anúncio" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  await requireOwnership(listing.authorId);
  const categories = await getCategories();

  return (
    <div className="container-page max-w-3xl py-10">
      <header className="mb-8 space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Editar anúncio</h1>
        <p className="text-muted-foreground">
          As alterações ficam visíveis imediatamente para quem visita o anúncio.
        </p>
      </header>

      <ListingForm
        action={updateListing.bind(null, listing.id)}
        categories={categories}
        submitLabel="Salvar alterações"
        defaultValues={{
          title: listing.title,
          description: listing.description,
          categoryId: listing.categoryId,
          intent: listing.intent,
          resourceType: listing.resourceType,
          exchange: listing.exchange,
          priceCents: listing.priceCents,
          city: listing.city,
          state: listing.state,
          latitude: listing.latitude,
          longitude: listing.longitude,
        }}
      />
    </div>
  );
}
