"use client";

import { LocateFixedIcon, SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_RADIUS_METERS } from "@/lib/geo";
import { EXCHANGE_LABELS, INTENT_LABELS, RESOURCE_LABELS } from "@/lib/taxonomy";

const ANY = "todos";

const RADIUS_OPTIONS = [
  { value: "5000", label: "5 km" },
  { value: "10000", label: "10 km" },
  { value: "25000", label: "25 km" },
  { value: "50000", label: "50 km" },
  { value: "100000", label: "100 km" },
  { value: "200000", label: "200 km" },
];

type Category = { id: string; slug: string; name: string };

export function SearchFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);

  const hasOrigin = searchParams.has("latitude") && searchParams.has("longitude");

  /** Reescreve a query string preservando os demais filtros. */
  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "" || value === ANY) next.delete(key);
        else next.set(key, value);
      }
      // Qualquer mudança de filtro invalida a paginação atual.
      next.delete("page");
      startTransition(() => router.push(`${pathname}?${next.toString()}`));
    },
    [pathname, router, searchParams],
  );

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Seu navegador não expõe a localização.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        apply({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          radius: searchParams.get("radius") ?? String(DEFAULT_RADIUS_METERS),
          sort: "distance",
        });
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização. Verifique a permissão do navegador.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const term = new FormData(event.currentTarget).get("q");
        apply({ q: typeof term === "string" ? term : null, sort: "relevance" });
      }}
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon
            className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="Aulas de matemática, cadeira de rodas, mutirão..."
            aria-label="Buscar anúncios"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={pending}>
          Buscar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="Tipo"
          value={searchParams.get("intent") ?? ANY}
          onValueChange={(value) => apply({ intent: value })}
          options={Object.entries(INTENT_LABELS)}
          anyLabel="Pedidos e ofertas"
        />
        <FilterSelect
          label="Natureza"
          value={searchParams.get("resourceType") ?? ANY}
          onValueChange={(value) => apply({ resourceType: value })}
          options={Object.entries(RESOURCE_LABELS)}
          anyLabel="Qualquer natureza"
        />
        <FilterSelect
          label="Troca"
          value={searchParams.get("exchange") ?? ANY}
          onValueChange={(value) => apply({ exchange: value })}
          options={Object.entries(EXCHANGE_LABELS)}
          anyLabel="Qualquer forma"
        />
        <FilterSelect
          label="Categoria"
          value={searchParams.get("category") ?? ANY}
          onValueChange={(value) => apply({ category: value })}
          options={categories.map((category) => [category.slug, category.name])}
          anyLabel="Todas as categorias"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Button
          type="button"
          variant={hasOrigin ? "accent" : "outline"}
          onClick={useMyLocation}
          disabled={locating}
        >
          <LocateFixedIcon />
          {hasOrigin ? "Localização ativa" : "Usar minha localização"}
        </Button>

        {hasOrigin && (
          <>
            <div className="grid w-40 gap-1.5">
              <Label htmlFor="radius">Raio</Label>
              <Select
                value={searchParams.get("radius") ?? String(DEFAULT_RADIUS_METERS)}
                onValueChange={(value) => apply({ radius: value })}
              >
                <SelectTrigger id="radius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                apply({ latitude: null, longitude: null, radius: null, sort: "recent" })
              }
            >
              <XIcon />
              Limpar localização
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  anyLabel,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: [string, string][];
  anyLabel: string;
}) {
  const id = `filtro-${label.toLowerCase()}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
