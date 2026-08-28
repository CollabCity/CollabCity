import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ListingCard as ListingCardData } from "@/server/queries/listings";
import { ListingCard } from "./listing-card";

function makeListing(overrides: Partial<ListingCardData> = {}): ListingCardData {
  return {
    id: "6f1c3f3a-2a4e-4c2a-9f6a-2b6a1c9d4e77",
    slug: "oficina-de-bicicletas",
    title: "Oficina aberta de manutenção de bicicletas",
    description: "Todo sábado de manhã abro minha bancada na praça.",
    intent: "offer",
    resourceType: "skill",
    exchange: "free",
    priceCents: null,
    city: "Recife",
    state: "PE",
    createdAt: new Date("2026-03-01T12:00:00Z"),
    categoryName: "Mobilidade",
    categorySlug: "mobilidade",
    categoryIcon: "bike",
    authorName: "Felipe Andrade",
    authorImage: null,
    coverImage: null,
    distanceMeters: null,
    ...overrides,
  };
}

describe("ListingCard", () => {
  it("liga o título ao anúncio", () => {
    const listing = makeListing();
    render(<ListingCard listing={listing} />);

    const link = screen.getByRole("link", { name: listing.title });
    expect(link).toHaveProperty("href", expect.stringContaining(`/anuncios/${listing.id}`));
  });

  it("mostra a cidade e o estado", () => {
    render(<ListingCard listing={makeListing()} />);
    expect(screen.getByText(/Recife, PE/)).toBeDefined();
  });

  it("rotula ofertas e pedidos de forma distinta", () => {
    const { unmount } = render(<ListingCard listing={makeListing({ intent: "offer" })} />);
    expect(screen.getByText("Oferta")).toBeDefined();
    unmount();

    render(<ListingCard listing={makeListing({ intent: "need" })} />);
    expect(screen.getByText("Pedido")).toBeDefined();
  });

  it("exibe o preço no lugar da forma de troca quando o anúncio é pago", () => {
    render(<ListingCard listing={makeListing({ exchange: "paid", priceCents: 8000 })} />);
    expect(screen.getByText(/80,00/)).toBeDefined();
    expect(screen.queryByText("Doação")).toBeNull();
  });

  it("mostra a distância apenas quando a busca tem origem", () => {
    const { unmount } = render(<ListingCard listing={makeListing()} />);
    expect(screen.queryByText(/km$/)).toBeNull();
    unmount();

    render(<ListingCard listing={makeListing({ distanceMeters: 5400 })} />);
    expect(screen.getByText("5.4 km")).toBeDefined();
  });
});
