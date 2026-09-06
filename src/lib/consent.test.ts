import { describe, expect, it } from "vitest";
import {
  ACCEPT_ALL,
  allowsAds,
  allowsAnalytics,
  CONSENT_VERSION,
  parseConsent,
  REJECT_ALL,
  serializeConsent,
} from "./consent";

describe("parseConsent", () => {
  it("lê de volta o que foi escrito", () => {
    expect(parseConsent(serializeConsent(ACCEPT_ALL))).toEqual(ACCEPT_ALL);
    expect(parseConsent(serializeConsent(REJECT_ALL))).toEqual(REJECT_ALL);
  });

  it("trata ausência de escolha como escolha nenhuma", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });

  it("descarta escolha feita sob outra versão", () => {
    // Um "sim" dado para outra descrição do que se coleta não vale para a nova.
    const antiga = encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION - 1, analytics: "granted", ads: "granted" }),
    );
    expect(parseConsent(antiga)).toBeNull();
  });

  it("não estoura com cookie corrompido", () => {
    // O valor vem do navegador de quem visita e pode chegar de qualquer jeito.
    expect(parseConsent("não é json")).toBeNull();
    expect(parseConsent("%%%")).toBeNull();
    expect(parseConsent("null")).toBeNull();
    expect(parseConsent('"texto"')).toBeNull();
    expect(parseConsent("[1,2,3]")).toBeNull();
  });

  it("qualquer valor que não seja 'granted' nega", () => {
    // O padrão é negar: um campo estranho nunca vira permissão.
    const torto = encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION, analytics: "sim", ads: true }),
    );
    expect(parseConsent(torto)).toEqual({
      version: CONSENT_VERSION,
      analytics: "denied",
      ads: "denied",
    });
  });

  it("aceita permissão parcial", () => {
    const parcial = encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION, analytics: "granted", ads: "denied" }),
    );
    const consent = parseConsent(parcial);
    expect(allowsAnalytics(consent)).toBe(true);
    expect(allowsAds(consent)).toBe(false);
  });
});

describe("allowsAnalytics e allowsAds", () => {
  it("negam quando não há escolha", () => {
    expect(allowsAnalytics(null)).toBe(false);
    expect(allowsAds(null)).toBe(false);
  });

  it("negam depois de recusa", () => {
    expect(allowsAnalytics(REJECT_ALL)).toBe(false);
    expect(allowsAds(REJECT_ALL)).toBe(false);
  });

  it("permitem depois de aceite", () => {
    expect(allowsAnalytics(ACCEPT_ALL)).toBe(true);
    expect(allowsAds(ACCEPT_ALL)).toBe(true);
  });
});
