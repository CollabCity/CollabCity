import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { RatingStars } from "@/components/rating-stars";
import { ReportActions } from "@/components/report-actions";
import { SuspendAccountForm } from "@/components/suspension-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  STATUS_LABELS,
} from "@/lib/taxonomy";
import type { ReportStatus, ReportTarget } from "@/lib/types";
import {
  getReportCounts,
  getReportedConversation,
  getReports,
  isAdmin,
  isModerator,
} from "@/server/queries/reports";

export const metadata: Metadata = { title: "Denúncias" };

const TABS: { value: ReportStatus; label: string }[] = [
  { value: "open", label: "Em aberto" },
  { value: "upheld", label: "Acolhidas" },
  { value: "dismissed", label: "Descartadas" },
];

/** O que "acolher" faz, por tipo de alvo. Fica visível antes de clicar. */
const CONSEQUENCES: Record<ReportTarget, string> = {
  listing: "Acolher arquiva o anúncio, que sai da busca imediatamente.",
  review: "Acolher oculta a avaliação, que deixa de aparecer e de contar na média.",
  conversation:
    "Não há conteúdo a remover em uma conversa privada. Acolher registra a decisão; a suspensão de contas ainda não existe na plataforma.",
};

type PageProps = { searchParams: Promise<{ status?: string }> };

function parseStatus(value: string | undefined): ReportStatus {
  return value === "upheld" || value === "dismissed" ? value : "open";
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await requireSession();

  // 404, e não 403: confirmar que a página existe já diria a quem sonda que há
  // uma área de moderação e que ela fica exatamente aqui.
  if (!(await isModerator(session.user.id))) notFound();

  const status = parseStatus((await searchParams).status);
  const [items, counts, admin] = await Promise.all([
    getReports(status),
    getReportCounts(),
    isAdmin(session.user.id),
  ]);

  // As mensagens das conversas denunciadas são buscadas de uma vez, e não dentro
  // do `map` da lista, para não render uma consulta por item.
  const transcripts = new Map(
    await Promise.all(
      items
        .filter((report) => report.target === "conversation")
        .map(
          async (report) =>
            [report.id, await getReportedConversation(report.id, session.user.id)] as const,
        ),
    ),
  );

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Denúncias</h1>
        <p className="text-muted-foreground text-sm">
          As mais antigas primeiro. Uma fila por data de chegada evita que denúncias envelheçam no
          fundo enquanto as recentes são resolvidas.
        </p>
      </header>

      <nav aria-label="Situação das denúncias" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={tab.value === status ? "primary" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/painel/denuncias?status=${tab.value}`}>
              {tab.label} ({counts[tab.value]})
            </Link>
          </Button>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          title={status === "open" ? "Nenhuma denúncia em aberto" : "Nada por aqui"}
          description={
            status === "open"
              ? "Quando alguém denunciar um anúncio, uma avaliação ou uma conversa, ela aparece aqui."
              : "Nenhuma denúncia foi resolvida dessa forma até agora."
          }
        />
      ) : (
        <ul className="grid gap-4">
          {items.map((report) => (
            <li key={report.id}>
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="highlight">{REPORT_REASON_LABELS[report.reason]}</Badge>
                    <Badge variant="outline">{REPORT_TARGET_LABELS[report.target]}</Badge>
                    <Badge variant="neutral">{REPORT_STATUS_LABELS[report.status]}</Badge>
                    <span className="ml-auto text-muted-foreground text-xs">
                      {report.reporterName} ·{" "}
                      <time dateTime={report.createdAt.toISOString()}>
                        {report.createdAt.toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </time>
                    </span>
                  </div>

                  {report.details && (
                    <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed">
                      {report.details}
                    </p>
                  )}

                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    {report.target === "listing" && report.listingId && (
                      <div className="space-y-1">
                        <Link
                          href={`/anuncios/${report.listingId}`}
                          className="inline-flex items-center gap-1.5 font-medium hover:underline"
                        >
                          {report.listingTitle}
                          <ExternalLinkIcon className="size-3.5" aria-hidden />
                        </Link>
                        {report.listingStatus && (
                          <p className="text-muted-foreground text-xs">
                            Situação do anúncio: {STATUS_LABELS[report.listingStatus]}
                          </p>
                        )}
                      </div>
                    )}

                    {report.target === "review" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {report.reviewRating !== null && (
                            <RatingStars value={report.reviewRating} starClassName="size-3.5" />
                          )}
                          <span className="text-muted-foreground text-xs">
                            sobre {report.reviewSubject}
                          </span>
                        </div>
                        {report.reviewComment && <p>{report.reviewComment}</p>}
                      </div>
                    )}

                    {report.target === "conversation" && (
                      <div className="space-y-1">
                        <p className="font-medium">{report.conversationListing}</p>
                        <details className="group">
                          <summary className="cursor-pointer text-muted-foreground text-xs underline underline-offset-2">
                            Ler as mensagens desta conversa
                          </summary>
                          {/* A conversa é privada. Ela só se abre porque existe
                              denúncia apontando para ela, e por isso fica atrás
                              de um clique explícito em vez de aberta na lista. */}
                          <ol className="mt-3 grid gap-2 border-border border-l-2 pl-3">
                            {(transcripts.get(report.id) ?? []).map((message) => (
                              <li key={message.id} className="text-sm">
                                <span className="font-medium">{message.senderName}</span>
                                <span className="text-muted-foreground text-xs">
                                  {" · "}
                                  <time dateTime={message.createdAt.toISOString()}>
                                    {message.createdAt.toLocaleString("pt-BR", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </time>
                                </span>
                                <p className="whitespace-pre-wrap">{message.body}</p>
                              </li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    )}
                  </div>

                  {report.status === "open" ? (
                    <div className="space-y-3">
                      <ReportActions
                        reportId={report.id}
                        consequence={CONSEQUENCES[report.target]}
                      />
                      {admin && report.targetOwnerId && report.targetOwnerName && (
                        <SuspendAccountForm
                          userId={report.targetOwnerId}
                          userName={report.targetOwnerName}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="border-border border-t pt-3 text-muted-foreground text-xs">
                      Resolvida
                      {report.resolvedAt && (
                        <>
                          {" em "}
                          <time dateTime={report.resolvedAt.toISOString()}>
                            {report.resolvedAt.toLocaleDateString("pt-BR")}
                          </time>
                        </>
                      )}
                      {report.resolutionNote && <p className="mt-1">{report.resolutionNote}</p>}
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
