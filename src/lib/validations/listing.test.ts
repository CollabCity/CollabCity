import { describe, expect, it } from "vitest";
import { DEFAULT_RADIUS_METERS } from "@/lib/geo";
import { listingInputSchema, parseSearchParams, searchParamsSchema } from "./listing";

const validListing = {
  title: "Ofereço aulas de reforço",
  description: "Descrição suficientemente longa para passar na validação mínima do formulário.",
  categoryId: "6f1c3f3a-2a4e-4c2a-9f6a-2b6a1c9d4e77",
  intent: "offer",
  resourceType: "skill",
  exchange: "free",
  city: "Recife",
  latitude: -8.0476,
  longitude: -34.877,
};

describe("listingInputSchema", () => {
  it("aceita um anúncio completo", () => {
    expect(listingInputSchema.safeParse(validListing).success).toBe(true);
  });

  it("recusa título curto demais", () => {
    const result = listingInputSchema.safeParse({ ...validListing, title: "Curto" });
    expect(result.success).toBe(false);
  });

  it("exige preço quando a troca é paga", () => {
    const result = listingInputSchema.safeParse({ ...validListing, exchange: "paid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "priceCents")).toBe(true);
    }
  });

  it("aceita preço quando a troca é paga", () => {
    const result = listingInputSchema.safeParse({
      ...validListing,
      exchange: "paid",
      priceCents: 8000,
    });
    expect(result.success).toBe(true);
  });

  it("recusa preço em anúncio gratuito", () => {
    // Sem essa regra, um anúncio marcado como doação poderia carregar um valor
    // que a interface não exibe, mas que fica gravado no banco.
    const result = listingInputSchema.safeParse({ ...validListing, priceCents: 5000 });
    expect(result.success).toBe(false);
  });

  it("recusa coordenadas fora da faixa", () => {
    expect(listingInputSchema.safeParse({ ...validListing, latitude: 120 }).success).toBe(false);
    expect(listingInputSchema.safeParse({ ...validListing, longitude: -200 }).success).toBe(false);
  });

  it("coage coordenadas enviadas como texto pelo formulário", () => {
    const result = listingInputSchema.safeParse({
      ...validListing,
      latitude: "-8.0476",
      longitude: "-34.877",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.latitude).toBeCloseTo(-8.0476);
  });
});

describe("searchParamsSchema", () => {
  it("aplica os padrões quando nada é informado", () => {
    const parsed = searchParamsSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBe("recent");
    expect(parsed.radius).toBe(DEFAULT_RADIUS_METERS);
  });

  it("recusa raio acima do teto", () => {
    expect(searchParamsSchema.safeParse({ radius: 5_000_000 }).success).toBe(false);
  });
});

describe("parseSearchParams", () => {
  it("lê filtros válidos da query string", () => {
    const parsed = parseSearchParams({
      q: "bicicleta",
      intent: "offer",
      radius: "10000",
      page: "3",
    });
    expect(parsed.q).toBe("bicicleta");
    expect(parsed.intent).toBe("offer");
    expect(parsed.radius).toBe(10_000);
    expect(parsed.page).toBe(3);
  });

  it("usa o primeiro valor quando o parâmetro se repete", () => {
    expect(parseSearchParams({ intent: ["need", "offer"] }).intent).toBe("need");
  });

  it("cai nos padrões em vez de falhar com entrada inválida", () => {
    // A query string é controlada por quem acessa: um valor inesperado não pode
    // derrubar a página de busca.
    const parsed = parseSearchParams({ intent: "invalido", page: "-5", radius: "abc" });
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBe("recent");
    expect(parsed.intent).toBeUndefined();
  });
});
