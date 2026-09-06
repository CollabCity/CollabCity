import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppealActions } from "@/components/appeal-actions";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import type { AppealStatus } from "@/lib/types";
import { getAppealCounts, getAppeals } from "@/server/queries/appeals";
import { isModerator } from "@/server/queries/reports";

export const metadata: Metadata = { title: "Contestações" };

const TABS: { value: AppealStatus; label: string }[] = [
  { value: "open", label: "Em aberto" },
  { value: "accepted", label: "Aceitas" },
  { value: "rejected", label: "Recusadas" },
];

type PageProps = { searchParams: Promise<{ status?: string }> };

function parseStatus(value: string | undefined): AppealStatus {
  return value === "accepted" || value === "rejected" ? value : "open";
}

export default async function AppealsPage({ searchParams }: PageProps) {
  const session = await requireSession();
  if (!(await isModerator(session.user.id))) notFound();

  const status = parseStatus((await searchParams).status);
  const [items, counts] = await Promise.all([getAppeals(status), getAppealCounts()]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Contestações</h1>
        <p className="text-muted-foreground text-sm">
          Pedidos de revisão de decisões da moderação. Quem tomou a decisão não julga a contestação
          dela — é o que faz da revisão um segundo olhar, e não uma confirmação.
        </p>
      </header>

      <nav aria-label="Situação das contestações" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={tab.value === status ? "primary" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/painel/contestacoes?status=${tab.value}`}>
              {tab.label} ({counts[tab.value]})
            </Link>
          </Button>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          title={status === "open" ? "Nenhuma contestação em aberto" : "Nada por aqui"}
          description="Contestações chegam quando alguém discorda de um anúncio arquivado, de uma avaliação ocultada ou de uma suspensão."
        />
      ) : (
        <ul className="grid gap-4">
          {items.map((appeal) => (
            <li key={appeal.id}>
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {appeal.suspensionId ? "Suspensão" : "Conteúdo removido"}
                    </Badge>
                    <span className="ml-auto text-muted-foreground text-xs">
                      <Link href={`/membros/${appeal.authorId}`} className="hover:underline">
                        {appeal.authorName}
                      </Link>{" "}
                      ·{" "}
                      <time dateTime={appeal.createdAt.toISOString()}>
                        {appeal.createdAt.toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </time>
                    </span>
                  </div>

                  <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium">Decisão contestada</p>
                    {appeal.suspensionId ? (
                      <p>{appeal.suspensionReason}</p>
                    ) : (
                      <p>
                        {appeal.reportListingId ? "Anúncio arquivado" : "Avaliação ocultada"}
                        {appeal.reportNote ? ` — ${appeal.reportNote}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-sm">O que a pessoa alega</p>
                    <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed">
                      {appeal.body}
                    </p>
                  </div>

                  {appeal.status === "open" ? (
                    <AppealActions
                      appealId={appeal.id}
                      blockedReason={
                        appeal.originalDecider === session.user.id
                          ? "Esta decisão foi sua. Outra pessoa da moderação precisa revisá-la."
                          : undefined
                      }
                    />
                  ) : (
                    <div className="border-border border-t pt-3 text-muted-foreground text-xs">
                      {appeal.status === "accepted" ? "Aceita" : "Recusada"}
                      {appeal.resolvedAt && (
                        <>
                          {" em "}
                          <time dateTime={appeal.resolvedAt.toISOString()}>
                            {appeal.resolvedAt.toLocaleDateString("pt-BR")}
                          </time>
                        </>
                      )}
                      {appeal.resolutionNote && <p className="mt-1">{appeal.resolutionNote}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
