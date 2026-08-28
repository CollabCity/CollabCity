"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { profiles, user } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { profileInputSchema } from "@/lib/validations/profile";
import { type ActionState, errorState, successState } from "./types";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();

  const raw = Object.fromEntries(formData.entries());
  const parsed = profileInputSchema.safeParse(raw);
  if (!parsed.success) {
    return errorState(
      "Revise os campos destacados.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const { name, website, ...profile } = parsed.data;

  await db.transaction(async (tx) => {
    await tx.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, session.user.id));

    await tx
      .insert(profiles)
      .values({
        userId: session.user.id,
        ...profile,
        website: website || null,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...profile, website: website || null, updatedAt: new Date() },
      });
  });

  revalidatePath("/painel/perfil");
  return successState("Perfil atualizado.");
}
