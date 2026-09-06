/**
 * Regras sobre os arquivos de imagem, independentes de onde eles são guardados.
 *
 * Tudo aqui é função pura: o que decide se um arquivo entra na plataforma
 * precisa ser testável sem disco, sem rede e sem banco.
 */

/** Formatos aceitos. SVG fica de fora de propósito — ver `detectImageType`. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

/** Teto por arquivo já **depois** da redução feita no navegador. */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Quantas imagens um anúncio comporta. */
export const MAX_IMAGES_PER_LISTING = 4;

/** Maior lado da imagem depois da redução no cliente, em pixels. */
export const MAX_IMAGE_DIMENSION = 1600;

const EXTENSIONS: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionFor(type: ImageType): string {
  return EXTENSIONS[type];
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * O tipo real do arquivo, lido dos primeiros bytes.
 *
 * O `Content-Type` que o navegador envia é escolhido por quem envia, então não
 * decide nada: um arquivo com script dentro chega anunciado como `image/png` se
 * o remetente quiser. A assinatura no início do arquivo é o que o formato de
 * fato exige.
 *
 * SVG não entra na lista, e a ausência é deliberada: SVG é XML, aceita
 * `<script>`, e um arquivo servido da mesma origem da aplicação viraria XSS.
 * Por não ter assinatura binária, ele simplesmente nunca casa aqui.
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";

  // WebP é um contêiner RIFF: "RIFF" nos bytes 0-3 e "WEBP" nos bytes 8-11.
  const isRiff = startsWith(bytes, [0x52, 0x49, 0x46, 0x46]);
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isRiff && isWebp) return "image/webp";

  return null;
}

/** Mensagem de recusa, ou `null` quando o arquivo passa. */
export function rejectionReason(bytes: Uint8Array): string | null {
  if (bytes.byteLength === 0) return "O arquivo está vazio.";
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return `Cada imagem deve ter no máximo ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`;
  }
  if (!detectImageType(bytes)) return "Envie uma imagem JPEG, PNG ou WebP.";
  return null;
}
