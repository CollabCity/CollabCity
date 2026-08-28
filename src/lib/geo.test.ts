import { describe, expect, it } from "vitest";
import {
  boundingBox,
  clampRadius,
  DEFAULT_RADIUS_METERS,
  haversineDistance,
  isValidCoordinates,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
} from "./geo";

const RECIFE = { latitude: -8.0476, longitude: -34.877 };
const OLINDA = { latitude: -8.0089, longitude: -34.8553 };
const SAO_PAULO = { latitude: -23.5505, longitude: -46.6333 };

describe("haversineDistance", () => {
  it("é zero entre um ponto e ele mesmo", () => {
    expect(haversineDistance(RECIFE, RECIFE)).toBe(0);
  });

  it("aproxima a distância entre Recife e Olinda", () => {
    // A distância real em linha reta é de aproximadamente 5 km.
    const meters = haversineDistance(RECIFE, OLINDA);
    expect(meters).toBeGreaterThan(4_500);
    expect(meters).toBeLessThan(5_500);
  });

  it("aproxima a distância entre Recife e São Paulo", () => {
    // Referência: cerca de 2.130 km em linha reta.
    const km = haversineDistance(RECIFE, SAO_PAULO) / 1000;
    expect(km).toBeGreaterThan(2_050);
    expect(km).toBeLessThan(2_200);
  });

  it("é simétrica", () => {
    expect(haversineDistance(RECIFE, SAO_PAULO)).toBeCloseTo(
      haversineDistance(SAO_PAULO, RECIFE),
      6,
    );
  });

  it("não estoura em pontos antípodas", () => {
    // Sem o `Math.min(1, ...)`, erro de ponto flutuante levaria `asin` a NaN.
    const meters = haversineDistance(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 180 },
    );
    expect(Number.isFinite(meters)).toBe(true);
    expect(meters / 1000).toBeGreaterThan(20_000);
  });
});

describe("clampRadius", () => {
  it("mantém valores dentro da faixa", () => {
    expect(clampRadius(25_000)).toBe(25_000);
  });

  it("eleva valores abaixo do mínimo", () => {
    expect(clampRadius(10)).toBe(MIN_RADIUS_METERS);
  });

  it("corta valores acima do máximo", () => {
    expect(clampRadius(10_000_000)).toBe(MAX_RADIUS_METERS);
  });

  it("cai no padrão para valores não numéricos", () => {
    expect(clampRadius(Number.NaN)).toBe(DEFAULT_RADIUS_METERS);
    expect(clampRadius(Number.POSITIVE_INFINITY)).toBe(DEFAULT_RADIUS_METERS);
  });
});

describe("isValidCoordinates", () => {
  it.each([
    [{ latitude: 0, longitude: 0 }, true],
    [{ latitude: -90, longitude: 180 }, true],
    [{ latitude: 90.1, longitude: 0 }, false],
    [{ latitude: 0, longitude: -180.5 }, false],
    [{ latitude: Number.NaN, longitude: 0 }, false],
  ])("valida %o como %s", (coordinates, expected) => {
    expect(isValidCoordinates(coordinates)).toBe(expected);
  });
});

describe("boundingBox", () => {
  it("envolve o centro", () => {
    const box = boundingBox(RECIFE, 25_000);
    expect(box.minLatitude).toBeLessThan(RECIFE.latitude);
    expect(box.maxLatitude).toBeGreaterThan(RECIFE.latitude);
    expect(box.minLongitude).toBeLessThan(RECIFE.longitude);
    expect(box.maxLongitude).toBeGreaterThan(RECIFE.longitude);
  });

  it("nunca ultrapassa os limites do globo", () => {
    const box = boundingBox({ latitude: 89.9, longitude: 179.9 }, MAX_RADIUS_METERS);
    expect(box.maxLatitude).toBeLessThanOrEqual(90);
    expect(box.minLatitude).toBeGreaterThanOrEqual(-90);
    expect(box.maxLongitude).toBeLessThanOrEqual(180);
    expect(box.minLongitude).toBeGreaterThanOrEqual(-180);
  });

  it("não gera valores infinitos sobre o polo", () => {
    // No polo, cos(lat) tende a zero e a conversão de longitude divergiria.
    const box = boundingBox({ latitude: 90, longitude: 0 }, 50_000);
    expect(Number.isFinite(box.minLongitude)).toBe(true);
    expect(Number.isFinite(box.maxLongitude)).toBe(true);
  });
});
