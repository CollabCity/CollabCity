"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { requireSession } from "@/lib/session";

/** Salva ou remove um anúncio da lista do membro. Devolve o novo estado. */
export async function toggleFavorite(listingId: string): Promise<{ saved: boolean }> {
  const session = await requireSession();
  const userId = session.user.id;

  const removed = await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)))
    .returning({ listingId: favorites.listingId });

  if (removed.length === 0) {
    await db.insert(favorites).values({ userId, listingId }).onConflictDoNothing();
  }

  revalidatePath("/painel/salvos");
  return { saved: removed.length === 0 };
}
