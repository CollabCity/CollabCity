import { describe, expect, it } from "vitest";
import {
  EXCHANGE_LABELS,
  INTENT_LABELS,
  intentVariant,
  RESOURCE_LABELS,
  STATUS_LABELS,
} from "./taxonomy";
import {
  EXCHANGE_MODES,
  LISTING_INTENTS,
  LISTING_STATUSES,
  RESOURCE_TYPES,
} from "./validations/listing";

describe("rótulos", () => {
  // Um valor novo no enum do banco sem rótulo correspondente apareceria como
  // `undefined` na interface. Estes testes travam as duas listas juntas.
  it.each([
    ["intenções", LISTING_INTENTS, INTENT_LABELS],
    ["naturezas", RESOURCE_TYPES, RESOURCE_LABELS],
    ["formas de troca", EXCHANGE_MODES, EXCHANGE_LABELS],
    ["situações", LISTING_STATUSES, STATUS_LABELS],
  ] as const)("cobrem todas as %s", (_name, values, labels) => {
    for (const value of values) {
      expect(labels[value as keyof typeof labels]).toBeTruthy();
    }
    expect(Object.keys(labels)).toHaveLength(values.length);
  });
});

describe("intentVariant", () => {
  it("usa o laranja da paleta para pedidos", () => {
    expect(intentVariant("need")).toBe("highlight");
  });

  it("usa o violeta da paleta para ofertas", () => {
    expect(intentVariant("offer")).toBe("primary");
  });
});
