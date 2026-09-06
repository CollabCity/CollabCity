import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { AwsClient } from "aws4fetch";
import { env } from "@/lib/env";
import { extensionFor, type ImageType } from "@/lib/images";

/**
 * Onde os arquivos enviados ficam.
 *
 * Dois destinos, escolhidos por `STORAGE_DRIVER`: o disco local, para
 * desenvolvimento, e qualquer serviço compatível com S3 — na prática o
 * Cloudflare R2, pela camada gratuita da
 * [ADR-0010](../../docs/decisions/0010-hospedagem-em-camada-gratuita.md).
 *
 * O disco local **não serve para produção**: em hospedagem serverless o sistema
 * de arquivos é efêmero e somente leitura, e cada instância teria os seus
 * próprios arquivos. `assertStorageConfigured` existe para que isso falhe na
 * partida, e não na primeira pessoa que tentar publicar uma foto.
 */

export type StoredFile = {
  /** Caminho dentro do armazenamento. É o que permite apagar depois. */
  key: string;
  /** Endereço público, gravado em `listing_images.url`. */
  url: string;
};

const LOCAL_ROOT = join(process.cwd(), "public", "uploads");

function s3Client(): AwsClient {
  return new AwsClient({
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    region: env.S3_REGION || "auto",
    service: "s3",
  });
}

function objectUrl(key: string): string {
  return `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET}/${key}`;
}

/**
 * Verifica a configuração antes de aceitar o primeiro arquivo.
 *
 * Chamada pela ação de envio. Sem ela, um deploy com `STORAGE_DRIVER=s3` e uma
 * variável faltando só quebraria quando alguém tentasse publicar uma foto — e o
 * erro apareceria como falha de upload, longe da causa.
 */
export function assertStorageConfigured(): void {
  if (env.STORAGE_DRIVER !== "s3") return;

  const missing = (
    [
      ["S3_ENDPOINT", env.S3_ENDPOINT],
      ["S3_BUCKET", env.S3_BUCKET],
      ["S3_ACCESS_KEY_ID", env.S3_ACCESS_KEY_ID],
      ["S3_SECRET_ACCESS_KEY", env.S3_SECRET_ACCESS_KEY],
      ["S3_PUBLIC_URL", env.S3_PUBLIC_URL],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`STORAGE_DRIVER=s3 exige: ${missing.join(", ")}.`);
  }
}

/** Grava um arquivo e devolve onde ele ficou. */
export async function putImage(
  bytes: Uint8Array,
  type: ImageType,
  prefix: string,
): Promise<StoredFile> {
  const key = `${prefix}/${randomUUID()}.${extensionFor(type)}`;

  if (env.STORAGE_DRIVER === "s3") {
    const response = await s3Client().fetch(objectUrl(key), {
      method: "PUT",
      // `BodyInit` não aceita `Uint8Array` genérico; o buffer por baixo, sim.
      body: bytes.buffer as ArrayBuffer,
      // O tipo vai do que foi detectado nos bytes, nunca do que o navegador
      // declarou: é este cabeçalho que o servidor vai devolver a quem baixar.
      headers: { "Content-Type": type, "Content-Length": String(bytes.byteLength) },
    });

    if (!response.ok) {
      throw new Error(`Falha ao enviar o arquivo (${response.status}).`);
    }

    return { key, url: `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}` };
  }

  const path = join(LOCAL_ROOT, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);

  return { key, url: `/uploads/${key}` };
}

/**
 * Apaga um arquivo. Nunca lança: a linha do banco já foi removida, e uma falha
 * aqui deixa um arquivo órfão — desperdício de espaço, não perda de dado.
 */
export async function removeImage(key: string): Promise<void> {
  try {
    if (env.STORAGE_DRIVER === "s3") {
      await s3Client().fetch(objectUrl(key), { method: "DELETE" });
      return;
    }
    await unlink(join(LOCAL_ROOT, key));
  } catch (error) {
    console.warn(`Não foi possível apagar ${key} do armazenamento:`, error);
  }
}
