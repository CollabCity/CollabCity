import { z } from "zod";
import { DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS, MIN_RADIUS_METERS } from "@/lib/geo";

export const LISTING_INTENTS = ["need", "offer"] as const;
export const RESOURCE_TYPES = ["skill", "item", "volunteer"] as const;
export const EXCHANGE_MODES = ["free", "trade", "paid"] as const;
export const LISTING_STATUSES = ["draft", "open", "fulfilled", "archived"] as const;

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

export const listingInputSchema = z
  .object({
    title: z.string().trim().min(8, "Descreva em pelo menos 8 caracteres").max(120),
    description: z.string().trim().min(30, "Explique com pelo menos 30 caracteres").max(4000),
    categoryId: z.uuid("Escolha uma categoria"),
    intent: z.enum(LISTING_INTENTS),
    resourceType: z.enum(RESOURCE_TYPES),
    exchange: z.enum(EXCHANGE_MODES),
    priceCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
    city: z.string().trim().min(2, "Informe a cidade").max(120),
    state: z.string().trim().max(120).optional(),
    country: z.string().trim().length(2).default("BR"),
    latitude,
    longitude,
    status: z.enum(LISTING_STATUSES).default("open"),
  })
  .refine((value) => value.exchange !== "paid" || typeof value.priceCents === "number", {
    message: "Informe o valor quando a troca for paga",
    path: ["priceCents"],
  })
  .refine((value) => value.exchange === "paid" || value.priceCents === undefined, {
    message: "O valor só se aplica a trocas pagas",
    path: ["priceCents"],
  });

export type ListingInput = z.infer<typeof listingInputSchema>;

export const SORT_OPTIONS = ["recent", "distance", "relevance"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/**
 * Filtros da busca. Todos os campos vêm da query string, então os tipos são
 * coagidos e valores inválidos caem no padrão em vez de quebrar a página.
 */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  intent: z.enum(LISTING_INTENTS).optional(),
  resourceType: z.enum(RESOURCE_TYPES).optional(),
  exchange: z.enum(EXCHANGE_MODES).optional(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),
  radius: z.coerce
    .number()
    .min(MIN_RADIUS_METERS)
    .max(MAX_RADIUS_METERS)
    .default(DEFAULT_RADIUS_METERS),
  sort: z.enum(SORT_OPTIONS).default("recent"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/** Lê filtros a partir da query string, descartando valores malformados. */
export function parseSearchParams(input: Record<string, string | string[] | undefined>) {
  const flat = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = searchParamsSchema.safeParse(flat);
  return parsed.success ? parsed.data : searchParamsSchema.parse({});
}
