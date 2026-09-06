import type { Metadata } from "next";
import Link from "next/link";
import { AppealForm } from "@/components/appeal-form";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { REPORT_REASON_LABELS } from "@/lib/taxonomy";
import { getDecisionsAbout } from "@/server/queries/appeals";

export const metadata: Metadata = { title: "Decisões sobre você" };

const APPEAL_LABELS: Record<string, string> = {
  open: "Contestação em análise",
  accepted: "Contestação aceita",
  rejected: "Contestação recusada",
};

/**
 * Decisões da moderação que atingiram o conteúdo da pessoa.
 *
 * Existe para que a moderação não seja silenciosa: sem esta tela, um anúncio
 * arquivado simplesmente sumia da busca sem nada dizer a quem o publicou.
 */
export default async function DecisionsPage() {
  const session = await requireSession();
  const decisions = await getDecisionsAbout(session.user.id);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Decisões sobre você</h1>
        <p className="text-muted-foreground text-sm">
          Quando uma denúncia sobre o seu conteúdo é acolhida, ela aparece aqui — com o motivo e a
          possibilidade de contestar uma vez.
        </p>
      </header>

      {decisions.length === 0 ? (
        <EmptyState
          title="Nenhuma decisão"
          description="Nenhuma denúncia sobre o seu conteúdo foi acolhida."
        />
      ) : (
        <ul className="grid gap-4">
          {decisions.map((decision) => (
            <li key={decision.reportId}>
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="highlight">{REPORT_REASON_LABELS[decision.reason]}</Badge>
                    {decision.appealStatus && (
                      <Badge variant="neutral">
                        {APPEAL_LABELS[decision.appealStatus] ?? decision.appealStatus}
                      </Badge>
                    )}
                    {decision.resolvedAt && (
                      <span className="ml-auto text-muted-foreground text-xs">
                        <time dateTime={decision.resolvedAt.toISOString()}>
                          {decision.resolvedAt.toLocaleDateString("pt-BR")}
                        </time>
                      </span>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    {decision.listingId ? (
                      <p>
                        O anúncio{" "}
                        <Link
                          href={`/anuncios/${decision.listingId}`}
                          className="font-medium hover:underline"
                        >
                          {decision.listingTitle}
                        </Link>{" "}
                        foi arquivado e saiu da busca.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <p>Uma avaliação que você escreveu foi ocultada.</p>
                        {decision.reviewComment && (
                          <p className="text-muted-foreground">“{decision.reviewComment}”</p>
                        )}
                      </div>
                    )}
                  </div>

                  {decision.resolutionNote && (
                    <p className="text-pretty text-sm leading-relaxed">
                      <span className="font-medium">Nota da moderação: </span>
                      {decision.resolutionNote}
                    </p>
                  )}

                  {decision.appealStatus ? (
                    <p className="text-muted-foreground text-xs">
                      Você já contestou esta decisão. É possível contestar uma vez.
                    </p>
                  ) : (
                    <AppealForm target="report" targetId={decision.reportId} />
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
