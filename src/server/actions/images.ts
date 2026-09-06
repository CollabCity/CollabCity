"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { listingImages, listings } from "@/db/schema";
import { detectImageType, MAX_IMAGES_PER_LISTING, rejectionReason } from "@/lib/images";
import { requireSession } from "@/lib/session";
import { assertStorageConfigured, putImage, removeImage } from "@/lib/storage";
import { pruneRateLimits, rateLimit } from "@/server/rate-limit";
import { type ActionState, errorState, successState } from "./types";

/** Confirma a autoria antes de qualquer escrita. Devolve `false` para quem não é dono. */
async function ownsListing(listingId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.authorId, userId)))
    .limit(1);

  return row !== undefined;
}

/**
 * Anexa imagens a um anúncio.
 *
 * Chamada pela ação de criação logo depois do `INSERT`, e pela tela de edição.
 * Cada arquivo é validado pelos **bytes**, não pelo `Content-Type` declarado —
 * ver `src/lib/images.ts`.
 *
 * Não confere autoria: quem chama já confirmou, e repetir aqui daria a falsa
 * impressão de que a função é segura de expor diretamente. Ela não é.
 */
export async function attachImages(
  listingId: string,
  files: File[],
): Promise<{ stored: number; error: string | null }> {
  const usable = files.filter((file) => file.size > 0);
  if (usable.length === 0) return { stored: 0, error: null };

  assertStorageConfigured();

  const [existing] = await db
    .select({ total: count() })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId));

  const already = existing?.total ?? 0;
  if (already + usable.length > MAX_IMAGES_PER_LISTING) {
    return {
      stored: 0,
      error: `Um anúncio comporta até ${MAX_IMAGES_PER_LISTING} imagens.`,
    };
  }

  let stored = 0;

  for (const [index, file] of usable.entries()) {
    const bytes = new Uint8Array(await file.arrayBuffer());

    const problem = rejectionReason(bytes);
    if (problem) return { stored, error: problem };

    const type = detectImageType(bytes);
    if (!type) return { stored, error: "Envie uma imagem JPEG, PNG ou WebP." };

    const file_ = await putImage(bytes, type, `anuncios/${listingId}`);

    await db.insert(listingImages).values({
      listingId,
      url: file_.url,
      storageKey: file_.key,
      sortOrder: already + index,
    });

    stored += 1;
  }

  return { stored, error: null };
}

/** Envio de imagens pela tela de edição do anúncio. */
export async function uploadListingImages(
  listingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  pruneRateLimits();
  if (!rateLimit(`image:upload:${session.user.id}`, 40, 60 * 60 * 1000)) {
    return errorState("Você enviou muitas imagens na última hora.");
  }

  if (!(await ownsListing(listingId, session.user.id))) {
    return errorState("Anúncio não encontrado.");
  }

  const files = formData.getAll("images").filter((value): value is File => value instanceof File);
  const { stored, error } = await attachImages(listingId, files);

  revalidatePath(`/anuncios/${listingId}`);
  revalidatePath(`/anuncios/${listingId}/editar`);

  if (error) return errorState(error);
  if (stored === 0) return errorState("Escolha ao menos uma imagem.");

  return successState(stored === 1 ? "Imagem adicionada." : `${stored} imagens adicionadas.`);
}

/** Remove uma imagem do anúncio e o arquivo correspondente. */
export async function deleteListingImage(
  imageId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  // A autoria entra na própria condição de remoção: sem a linha correspondente,
  // nada acontece — mesmo padrão do resto das escritas.
  const [removed] = await db
    .delete(listingImages)
    .where(
      and(
        eq(listingImages.id, imageId),
        inArray(
          listingImages.listingId,
          db
            .select({ id: listings.id })
            .from(listings)
            .where(eq(listings.authorId, session.user.id)),
        ),
      ),
    )
    .returning({ listingId: listingImages.listingId, storageKey: listingImages.storageKey });

  if (!removed) return errorState("Imagem não encontrada.");

  if (removed.storageKey) await removeImage(removed.storageKey);

  revalidatePath(`/anuncios/${removed.listingId}`);
  revalidatePath(`/anuncios/${removed.listingId}/editar`);

  return successState("Imagem removida.");
}

/** Anúncio ao qual a imagem pertence, se ela for de quem está pedindo. */
async function ownedImage(imageId: string, userId: string) {
  const [row] = await db
    .select({ id: listingImages.id, listingId: listingImages.listingId })
    .from(listingImages)
    .innerJoin(listings, eq(listings.id, listingImages.listingId))
    .where(and(eq(listingImages.id, imageId), eq(listings.authorId, userId)))
    .limit(1);

  return row ?? null;
}

/**
 * Grava a descrição de uma imagem.
 *
 * O texto alternativo não é enfeite: sem ele, quem usa leitor de tela recebe
 * uma imagem muda no meio do anúncio. Fica opcional porque uma descrição ruim
 * atrapalha mais que a ausência — mas o campo está ali, pedindo.
 */
export async function updateImageAlt(
  imageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const image = await ownedImage(imageId, session.user.id);
  if (!image) return errorState("Imagem não encontrada.");

  const alt = String(formData.get("alt") ?? "").trim();
  if (alt.length > 200) return errorState("A descrição deve ter no máximo 200 caracteres.");

  await db
    .update(listingImages)
    .set({ alt: alt || null })
    .where(eq(listingImages.id, imageId));

  revalidatePath(`/anuncios/${image.listingId}`);
  revalidatePath(`/anuncios/${image.listingId}/editar`);

  return successState("Descrição salva.");
}

/**
 * Troca a imagem de lugar com a vizinha.
 *
 * Botões de subir e descer, e não arrastar: arrastar exige ponteiro preciso,
 * não funciona com teclado e é um pesadelo em leitor de tela. A troca acontece
 * em transação porque são duas linhas que precisam mudar juntas — se só uma
 * mudasse, duas imagens ficariam com a mesma posição.
 */
export async function moveListingImage(
  imageId: string,
  direction: "up" | "down",
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const image = await ownedImage(imageId, session.user.id);
  if (!image) return errorState("Imagem não encontrada.");

  const ordered = await db
    .select({ id: listingImages.id })
    .from(listingImages)
    .where(eq(listingImages.listingId, image.listingId))
    .orderBy(listingImages.sortOrder, listingImages.createdAt);

  const position = ordered.findIndex((row) => row.id === imageId);
  const target = direction === "up" ? position - 1 : position + 1;

  if (position === -1 || target < 0 || target >= ordered.length) {
    return errorState("A imagem já está nessa ponta.");
  }

  const reordered = [...ordered];
  const [moved] = reordered.splice(position, 1);
  if (moved) reordered.splice(target, 0, moved);

  // Reescreve a ordem inteira: é uma lista de no máximo quatro itens, e assim
  // posições duplicadas herdadas de qualquer inserção antiga se resolvem.
  await db.transaction(async (tx) => {
    for (const [index, row] of reordered.entries()) {
      await tx.update(listingImages).set({ sortOrder: index }).where(eq(listingImages.id, row.id));
    }
  });

  revalidatePath(`/anuncios/${image.listingId}`);
  revalidatePath(`/anuncios/${image.listingId}/editar`);

  return successState("Ordem atualizada.");
}
