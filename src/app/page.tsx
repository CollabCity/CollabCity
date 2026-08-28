import { ArrowRightIcon, HandHeartIcon, MapPinnedIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { searchParamsSchema } from "@/lib/validations/listing";
import { getCategories, getPlatformStats, searchListings } from "@/server/queries/listings";

export const revalidate = 60;

export default async function HomePage() {
  const [stats, categories, recent] = await Promise.all([
    getPlatformStats(),
    getCategories(),
    searchListings(searchParamsSchema.parse({})),
  ]);

  return (
    <>
      <section className="border-border border-b bg-gradient-to-b from-secondary/60 to-background">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="space-y-6">
            <Badge variant="outline" className="gap-1.5">
              <HandHeartIcon className="size-3.5" aria-hidden />
              Projeto open source, feito pela comunidade
            </Badge>

            <h1 className="text-balance font-semibold text-4xl leading-tight tracking-tight sm:text-5xl">
              Conecte quem precisa de ajuda com quem tem algo a oferecer
            </h1>

            <p className="max-w-xl text-pretty text-lg text-muted-foreground">
              Publique um pedido ou uma oferta de habilidades, itens e horas de voluntariado.
              Encontre pessoas por perto usando busca por raio, categoria e forma de troca.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/anuncios/novo">
                  Publicar um anúncio
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/anuncios">
                  <SearchIcon />
                  Ver o que há por perto
                </Link>
              </Button>
            </div>

            <dl className="grid max-w-lg grid-cols-3 gap-4 pt-4">
              <Stat label="Anúncios abertos" value={stats.openListings} />
              <Stat label="Ofertas" value={stats.offers} />
              <Stat label="Cidades" value={stats.cities} />
            </dl>
          </div>

          <ul className="grid content-start gap-4">
            <HowItWorks
              step="1"
              title="Diga o que você precisa ou oferece"
              description="Escolha entre habilidade, item ou voluntariado e defina se é doação, troca ou serviço pago."
            />
            <HowItWorks
              step="2"
              title="Encontre pessoas por perto"
              description="A busca usa a sua localização e um raio ajustável para priorizar quem está na mesma região."
            />
            <HowItWorks
              step="3"
              title="Combine os detalhes na conversa"
              description="Cada anúncio abre um canal direto entre quem publicou e quem se interessou."
            />
          </ul>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="font-semibold text-2xl tracking-tight">Categorias</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Um recorte inicial curado pela comunidade.
        </p>

        <ul className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/anuncios?category=${category.slug}`}>{category.name}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page pb-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-semibold text-2xl tracking-tight">Publicados recentemente</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              <MapPinnedIcon className="mr-1 inline size-4" aria-hidden />
              Ative a localização na busca para ver primeiro o que está mais perto.
            </p>
          </div>
          <Button variant="link" asChild>
            <Link href="/anuncios">
              Ver todos
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>

        {recent.items.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-10 text-center text-muted-foreground text-sm">
              Ainda não há anúncios publicados. Seja a primeira pessoa a publicar.
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.items.slice(0, 6).map((listing) => (
              <li key={listing.id} className="relative">
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-semibold text-2xl tabular-nums">{value}</dd>
    </div>
  );
}

function HowItWorks({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Card>
        <CardContent className="flex gap-4 p-5">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-sm"
          >
            {step}
          </span>
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
