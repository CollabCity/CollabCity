import type { Metadata } from "next";
import { ListingForm } from "@/components/listing-form";
import { requireSession } from "@/lib/session";
import { createListing } from "@/server/actions/listings";
import { getCategories } from "@/server/queries/listings";

export const metadata: Metadata = { title: "Publicar anúncio" };

export default async function NewListingPage() {
  await requireSession();
  const categories = await getCategories();

  return (
    <div className="container-page max-w-3xl py-10">
      <header className="mb-8 space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Publicar anúncio</h1>
        <p className="text-muted-foreground">
          Descreva com clareza o que você precisa ou oferece. Anúncios objetivos recebem mais
          respostas.
        </p>
      </header>

      <ListingForm action={createListing} categories={categories} submitLabel="Publicar" />
    </div>
  );
}
