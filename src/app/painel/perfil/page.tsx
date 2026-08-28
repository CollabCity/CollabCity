import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { requireSession } from "@/lib/session";
import { getProfile } from "@/server/queries/listings";

export const metadata: Metadata = { title: "Editar perfil" };

export default async function ProfilePage() {
  const session = await requireSession();
  const profile = await getProfile(session.user.id);
  if (!profile) notFound();

  return (
    <section className="max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Perfil</h1>
        <p className="text-muted-foreground text-sm">
          A localização define o centro das suas buscas por proximidade.
        </p>
      </header>

      <ProfileForm profile={profile} />
    </section>
  );
}
