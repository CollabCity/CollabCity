import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
          A localização define o centro das suas buscas por proximidade. Cidade e estado aparecem no
          seu perfil público; as coordenadas, não.
        </p>
        <Link
          href={`/membros/${session.user.id}`}
          className="inline-flex items-center gap-1.5 text-sm underline underline-offset-2"
        >
          Ver meu perfil público
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </Link>
      </header>

      <ProfileForm profile={profile} />
    </section>
  );
}
