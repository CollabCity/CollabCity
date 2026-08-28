import { customType } from "drizzle-orm/pg-core";

/**
 * Coluna PostGIS `geography`.
 *
 * O tipo é declarado sem typmod porque o valor é sempre produzido por uma
 * coluna gerada que aplica `ST_SetSRID(..., 4326)::geography`, garantindo ponto
 * e SRID na própria expressão. A aplicação nunca escreve nesta coluna: ela é
 * derivada de `latitude`/`longitude` e lida pelas consultas espaciais, que
 * projetam o ponto com `ST_X`/`ST_Y`.
 */
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography";
  },
});

/** Coluna `tsvector` usada pela busca textual em português. */
export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});
