import { describe, expect, it } from "vitest";
import {
  formatMemberSince,
  formatRating,
  formatResponseTime,
  formatReviewCount,
  isNewMember,
  MIN_CONVERSATIONS_FOR_RESPONSE_RATE,
  RATING_LABELS,
  RATING_VALUES,
  responseRate,
} from "./reputation";

describe("responseRate", () => {
  it("calcula a proporção de conversas respondidas", () => {
    expect(responseRate({ received: 10, answered: 8, medianSeconds: null })).toBeCloseTo(0.8);
  });

  it("omite a taxa enquanto houver poucas conversas", () => {
    // Uma conversa sem resposta viraria "0%", que se lê como acusação.
    expect(responseRate({ received: 1, answered: 0, medianSeconds: null })).toBeNull();
    expect(responseRate({ received: 2, answered: 2, medianSeconds: null })).toBeNull();
  });

  it("passa a exibir a taxa exatamente no mínimo", () => {
    const stats = {
      received: MIN_CONVERSATIONS_FOR_RESPONSE_RATE,
      answered: 3,
      medianSeconds: null,
    };
    expect(responseRate(stats)).toBe(1);
  });
});

describe("formatResponseTime", () => {
  it("agrupa abaixo de uma hora", () => {
    expect(formatResponseTime(1_200)).toBe("em menos de uma hora");
  });

  it("usa horas dentro do mesmo dia", () => {
    expect(formatResponseTime(5 * 3_600)).toBe("em cerca de 5 horas");
  });

  it("usa um dia entre 24 e 48 horas", () => {
    expect(formatResponseTime(30 * 3_600)).toBe("em cerca de um dia");
  });

  it("usa dias acima de 48 horas", () => {
    expect(formatResponseTime(5 * 86_400)).toBe("em cerca de 5 dias");
  });

  it("devolve nulo quando não há mediana", () => {
    expect(formatResponseTime(null)).toBeNull();
    expect(formatResponseTime(undefined)).toBeNull();
  });
});

describe("isNewMember", () => {
  const now = new Date("2026-09-05T12:00:00Z");

  it("marca quem entrou dentro da janela", () => {
    expect(isNewMember(new Date("2026-08-20T12:00:00Z"), now)).toBe(true);
  });

  it("não marca quem já passou da janela", () => {
    expect(isNewMember(new Date("2026-07-01T12:00:00Z"), now)).toBe(false);
  });
});

describe("formatRating", () => {
  it("usa uma casa decimal com vírgula", () => {
    expect(formatRating(4.666)).toBe("4,7");
  });

  it("devolve nulo quando ainda não há média", () => {
    expect(formatRating(null)).toBeNull();
  });
});

describe("formatReviewCount", () => {
  it("concorda o singular", () => {
    expect(formatReviewCount(1)).toBe("1 avaliação");
  });

  it("concorda o plural", () => {
    expect(formatReviewCount(12)).toBe("12 avaliações");
  });
});

describe("formatMemberSince", () => {
  it("escreve mês e ano por extenso", () => {
    expect(formatMemberSince(new Date("2026-03-15T12:00:00Z"))).toBe("desde março de 2026");
  });
});

describe("RATING_LABELS", () => {
  it("tem rótulo para toda nota possível", () => {
    // Uma nota sem rótulo apareceria como `undefined` na tela e no leitor de tela.
    for (const value of RATING_VALUES) {
      expect(RATING_LABELS[value]).toBeTruthy();
    }
  });
});
