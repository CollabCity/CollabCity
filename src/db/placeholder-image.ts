import { crc32, deflateSync } from "node:zlib";

/**
 * Gera um PNG de gradiente, sem dependência nenhuma.
 *
 * Existe só para o seed: sem isto, um banco recém-populado não teria uma única
 * foto, e a galeria, a capa do cartão e o recorte da busca ficariam invisíveis
 * até alguém publicar algo à mão. Não é editor de imagem — é o mínimo para que
 * a demonstração mostre o que o código faz.
 */
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(typed));

  return Buffer.concat([length, typed, checksum]);
}

/** Duas cores derivadas de uma semente, para cada anúncio ter a sua. */
function palette(seed: number): [number[], number[]] {
  const hue = (seed * 47) % 360;
  const toRgb = (h: number, light: number): number[] => {
    const c = (1 - Math.abs(2 * light - 1)) * 0.45;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - c / 2;
    const [r, g, b] =
      h < 60
        ? [c, x, 0]
        : h < 120
          ? [x, c, 0]
          : h < 180
            ? [0, c, x]
            : h < 240
              ? [0, x, c]
              : h < 300
                ? [x, 0, c]
                : [c, 0, x];
    return [r, g, b].map((value) => Math.round((value + m) * 255));
  };

  return [toRgb(hue, 0.62), toRgb((hue + 40) % 360, 0.38)];
}

export function placeholderPng(seed: number, width = 800, height = 600): Buffer {
  const [from, to] = palette(seed);

  // Cada linha começa com o byte de filtro 0 ("nenhum"), como o formato exige.
  const raw = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0;
    offset += 1;

    for (let x = 0; x < width; x += 1) {
      const mix = (x / width) * 0.5 + (y / height) * 0.5;
      for (let channel = 0; channel < 3; channel += 1) {
        const start = from[channel] ?? 0;
        const end = to[channel] ?? 0;
        raw[offset] = Math.round(start + (end - start) * mix);
        offset += 1;
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // profundidade de bits
  header[9] = 2; // cor verdadeira, sem canal alfa
  header[10] = 0; // compressão deflate
  header[11] = 0; // filtro adaptativo
  header[12] = 0; // sem entrelaçamento

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
