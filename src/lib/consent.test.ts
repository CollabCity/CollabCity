import { describe, expect, it } from "vitest";
import {
  ACCEPT_ALL,
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
      JSON.stringify({ version: CONSENT_VERSION - 1, analytics: "granted" }),
    );
    expect(parseConsent(antiga)).toBeNull();
  });

  it("ignora a publicidade que os cookies antigos ainda carregam", () => {
    // A publicidade saiu (ADR-0025) sem subir a versão: a coleta encolheu, e
    // quem já escolheu não é perguntado de novo. O que estes cookies dizem
    // sobre anúncio não significa mais nada, e o que dizem sobre medição
    // continua valendo — inclusive a recusa.
    const aceitouTudo = encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION, analytics: "granted", ads: "granted" }),
    );
    expect(parseConsent(aceitouTudo)).toEqual(ACCEPT_ALL);

    const recusouTudo = encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION, analytics: "denied", ads: "denied" }),
    );
    expect(parseConsent(recusouTudo)).toEqual(REJECT_ALL);
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
      JSON.stringify({ version: CONSENT_VERSION, analytics: "sim" }),
    );
    expect(parseConsent(torto)).toEqual({ version: CONSENT_VERSION, analytics: "denied" });
  });
});

describe("allowsAnalytics", () => {
  it("nega quando não há escolha", () => {
    expect(allowsAnalytics(null)).toBe(false);
  });

  it("nega depois de recusa", () => {
    expect(allowsAnalytics(REJECT_ALL)).toBe(false);
  });

  it("permite depois de aceite", () => {
    expect(allowsAnalytics(ACCEPT_ALL)).toBe(true);
  });
});
