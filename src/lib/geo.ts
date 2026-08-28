/** Raio médio da Terra em metros, conforme WGS 84. */
const EARTH_RADIUS_METERS = 6_371_008.8;

export const MIN_RADIUS_METERS = 1_000;
export const MAX_RADIUS_METERS = 200_000;
export const DEFAULT_RADIUS_METERS = 25_000;

export type Coordinates = { latitude: number; longitude: number };

/** Faixas válidas para coordenadas em WGS 84. */
export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidCoordinates(value: Coordinates): boolean {
  return isValidLatitude(value.latitude) && isValidLongitude(value.longitude);
}

/**
 * Mantém o raio de busca dentro dos limites aceitos.
 *
 * O teto existe para que uma busca não degenere em varredura completa da
 * tabela, o que anularia o índice GiST.
 */
export function clampRadius(meters: number): number {
  if (!Number.isFinite(meters)) return DEFAULT_RADIUS_METERS;
  return Math.min(Math.max(Math.round(meters), MIN_RADIUS_METERS), MAX_RADIUS_METERS);
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Distância em metros entre duas coordenadas pela fórmula de Haversine.
 *
 * O banco calcula distâncias com `ST_Distance` sobre `geography`, que usa o
 * elipsoide e é mais preciso. Esta função serve ao cliente, que precisa de uma
 * estimativa imediata sem ida ao servidor.
 */
export function haversineDistance(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Caixa envolvente aproximada de um raio, útil para enquadrar um mapa.
 *
 * Perto dos polos a conversão de longitude explode, então o valor é limitado
 * para não gerar uma caixa maior que o mundo.
 */
export function boundingBox(center: Coordinates, radiusMeters: number) {
  const latDelta = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const cosLat = Math.cos(toRadians(center.latitude));
  const lngDelta = Math.abs(cosLat) < 1e-6 ? 180 : Math.min(180, latDelta / Math.abs(cosLat));

  return {
    minLatitude: Math.max(-90, center.latitude - latDelta),
    maxLatitude: Math.min(90, center.latitude + latDelta),
    minLongitude: Math.max(-180, center.longitude - lngDelta),
    maxLongitude: Math.min(180, center.longitude + lngDelta),
  };
}
