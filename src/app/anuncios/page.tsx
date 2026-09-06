import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Ad } from "@/components/ads";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { SearchFilters } from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { parseSearchParams } from "@/lib/validations/listing";
import { getCategories, searchListings } from "@/server/queries/listings";

export const metadata: Metadata = {
  title: "Explorar anúncios",
  description: "Encontre pedidos e ofertas de habilidades, itens e voluntariado perto de você.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ListingsPage({ searchParams }: PageProps) {
  const params = parseSearchParams(await searchParams);
  const categories = await getCategories();

  return (
    <div className="container-page space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Explorar</h1>
        <p className="text-muted-foreground">
          Filtre por tipo, natureza, forma de troca e distância.
        </p>
      </header>

      <SearchFilters categories={categories} />

      <Suspense key={JSON.stringify(params)} fallback={<ResultsSkeleton />}>
        <Results params={params} />
      </Suspense>
    </div>
  );
}

async function Results({ params }: { params: ReturnType<typeof parseSearchParams> }) {
  const { items, page, hasNextPage, hasPreviousPage } = await searchListings(params);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhum anúncio encontrado"
        description="Tente ampliar o raio de busca, remover filtros ou usar outras palavras."
        action={
          <Button variant="outline" asChild>
            <Link href="/anuncios">Limpar filtros</Link>
          </Button>
        }
      />
    );
  }

  const pageHref = (target: number) => {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined) as [string, string][],
    );
    next.set("page", String(target));
    return `/anuncios?${next.toString()}`;
  };

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((listing) => (
          <li key={listing.id} className="relative">
            <ListingCard listing={listing} />
          </li>
        ))}
      </ul>

      {/* `intent` fecha a publicidade quando a busca está filtrada por pedidos:
          quem procura alguém precisando de ajuda não é público de anunciante. */}
      <Ad intent={params.intent} />

      {(hasPreviousPage || hasNextPage) && (
        <nav className="flex items-center justify-between" aria-label="Paginação">
          <Button variant="outline" asChild disabled={!hasPreviousPage}>
            <Link href={pageHref(page - 1)} aria-disabled={!hasPreviousPage}>
              Anterior
            </Link>
          </Button>
          <span className="text-muted-foreground text-sm">Página {page}</span>
          <Button variant="outline" asChild disabled={!hasNextPage}>
            <Link href={pageHref(page + 1)} aria-disabled={!hasNextPage}>
              Próxima
            </Link>
          </Button>
        </nav>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => index).map((index) => (
        <li key={index}>
          <Skeleton className="h-56 w-full" />
        </li>
      ))}
    </ul>
  );
}
