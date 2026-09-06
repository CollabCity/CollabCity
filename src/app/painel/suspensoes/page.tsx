import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { LiftSuspensionForm } from "@/components/suspension-actions";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { getActiveSuspensions, isAdmin } from "@/server/queries/reports";

export const metadata: Metadata = { title: "Suspensões" };

export default async function SuspensionsPage() {
  const session = await requireSession();

  // 404 e não 403, como toda a área de moderação.
  if (!(await isAdmin(session.user.id))) notFound();

  const items = await getActiveSuspensions();

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Contas suspensas</h1>
        <p className="text-muted-foreground text-sm">
          Enquanto a suspensão dura, a pessoa não publica, não conversa, não avalia nem denuncia, e
          os anúncios dela saem da busca. Suspender é ação de administração; resolver denúncia, não.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma conta suspensa"
          description="Suspensões são feitas a partir de uma denúncia, na fila de moderação."
        />
      ) : (
        <ul className="grid gap-4">
          {items.map((suspension) => (
            <li key={suspension.id}>
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/membros/${suspension.userId}`}
                      className="font-medium hover:underline"
                    >
                      {suspension.userName}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                      desde{" "}
                      <time dateTime={suspension.createdAt.toISOString()}>
                        {suspension.createdAt.toLocaleDateString("pt-BR")}
                      </time>
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed">
                    {suspension.reason}
                  </p>

                  <div className="border-border border-t pt-4">
                    <LiftSuspensionForm suspensionId={suspension.id} />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
