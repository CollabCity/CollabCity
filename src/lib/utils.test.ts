import { describe, expect, it } from "vitest";
import { cn, formatDistance, formatPrice, initials, slugify } from "./utils";

describe("slugify", () => {
  it("remove acentos e normaliza separadores", () => {
    expect(slugify("Reforço de Matemática")).toBe("reforco-de-matematica");
  });

  it("descarta pontuação e espaços nas pontas", () => {
    expect(slugify("  Oficina: bicicletas!  ")).toBe("oficina-bicicletas");
  });

  it("limita o comprimento", () => {
    expect(slugify("a".repeat(200))).toHaveLength(80);
  });

  it("devolve string vazia quando não há caracteres aproveitáveis", () => {
    expect(slugify("!!! ???")).toBe("");
  });
});

describe("formatDistance", () => {
  it("usa metros abaixo de um quilômetro", () => {
    expect(formatDistance(850)).toBe("850 m");
  });

  it("usa uma casa decimal até dez quilômetros", () => {
    expect(formatDistance(5_400)).toBe("5.4 km");
  });

  it("arredonda acima de dez quilômetros", () => {
    expect(formatDistance(42_600)).toBe("43 km");
  });

  it("devolve nulo quando não há distância", () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(undefined)).toBeNull();
  });
});

describe("formatPrice", () => {
  it("converte centavos em moeda brasileira", () => {
    // O separador é um espaço estreito não quebrável, não um espaço comum.
    expect(formatPrice(8000)?.replace(/\s/g, " ")).toBe("R$ 80,00");
  });

  it("trata zero como valor válido", () => {
    expect(formatPrice(0)).not.toBeNull();
  });

  it("devolve nulo quando não há preço", () => {
    expect(formatPrice(null)).toBeNull();
  });
});

describe("cn", () => {
  it("resolve conflitos do Tailwind mantendo a última classe", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignora valores falsos", () => {
    expect(cn("flex", false && "hidden", undefined, "gap-2")).toBe("flex gap-2");
  });
});

describe("initials", () => {
  it("usa as duas primeiras palavras", () => {
    expect(initials("Ana Ribeiro Nunes")).toBe("AR");
  });

  it("funciona com um nome só", () => {
    expect(initials("Ana")).toBe("A");
  });

  it("ignora espaços extras", () => {
    expect(initials("  Bruno   Cavalcanti ")).toBe("BC");
  });

  it("devolve string vazia para nome vazio", () => {
    expect(initials("")).toBe("");
  });
});
