"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { listingInputSchema } from "@/lib/validations/listing";
import { pruneRateLimits, rateLimit } from "@/server/rate-limit";
import { type ActionState, errorState, successState } from "./types";

/** Converte o FormData em um objeto plano, ignorando campos vazios opcionais. */
function toObject(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ""));
}

export async function createListing(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();

  pruneRateLimits();
  if (!rateLimit(`listing:create:${session.user.id}`, 10, 60 * 60 * 1000)) {
    return errorState("Você atingiu o limite de publicações por hora. Tente mais tarde.");
  }

  const parsed = listingInputSchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return errorState(
      "Revise os campos destacados.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const [created] = await db
    .insert(listings)
    .values({ ...parsed.data, authorId: session.user.id, slug: slugify(parsed.data.title) })
    .returning({ id: listings.id });

  if (!created) return errorState("Não foi possível publicar o anúncio.");

  revalidatePath("/anuncios");
  revalidatePath("/painel");
  redirect(`/anuncios/${created.id}`);
}

export async function updateListing(
  listingId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = listingInputSchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return errorState(
      "Revise os campos destacados.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  // A condição de autoria vai no próprio UPDATE: sem uma linha correspondente
  // nada é alterado, o que evita uma checagem separada e a corrida entre elas.
  const updated = await db
    .update(listings)
    .set({
      ...parsed.data,
      slug: slugify(parsed.data.title),
      priceCents: parsed.data.priceCents ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(listings.id, listingId), eq(listings.authorId, session.user.id)))
    .returning({ id: listings.id });

  if (updated.length === 0) return errorState("Anúncio não encontrado.");

  revalidatePath(`/anuncios/${listingId}`);
  revalidatePath("/painel");
  return successState("Anúncio atualizado.");
}

export async function setListingStatus(
  listingId: string,
  status: "open" | "fulfilled" | "archived",
): Promise<ActionState> {
  const session = await requireSession();

  const updated = await db
    .update(listings)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(listings.id, listingId), eq(listings.authorId, session.user.id)))
    .returning({ id: listings.id });

  if (updated.length === 0) return errorState("Anúncio não encontrado.");

  revalidatePath("/painel");
  revalidatePath(`/anuncios/${listingId}`);
  return successState("Situação atualizada.");
}

export async function deleteListing(listingId: string): Promise<ActionState> {
  const session = await requireSession();

  const deleted = await db
    .delete(listings)
    .where(and(eq(listings.id, listingId), eq(listings.authorId, session.user.id)))
    .returning({ id: listings.id });

  if (deleted.length === 0) return errorState("Anúncio não encontrado.");

  revalidatePath("/painel");
  revalidatePath("/anuncios");
  return successState("Anúncio removido.");
}
