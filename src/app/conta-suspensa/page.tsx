import { AlertOctagonIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppealForm } from "@/components/appeal-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { getSuspensionAppeal } from "@/server/queries/appeals";
import { activeSuspension } from "@/server/queries/reports";

export const metadata: Metadata = { title: "Conta suspensa" };

/**
 * Explica a suspensão a quem foi suspenso.
 *
 * Usa `getSession`, e não `requireSession`: aquela redireciona justamente para
 * cá, e a página entraria em laço consigo mesma.
 */
export default async function SuspendedAccountPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const suspension = await activeSuspension(session.user.id);
  if (!suspension) redirect("/painel");

  const appeal = await getSuspensionAppeal(suspension.id, session.user.id);

  return (
    <div className="container-page max-w-2xl py-16">
      <Card>
        <CardContent className="space-y-5 p-8">
          <div className="flex items-center gap-3">
            <AlertOctagonIcon className="size-6 text-destructive" aria-hidden />
            <h1 className="font-semibold text-2xl tracking-tight">Sua conta está suspensa</h1>
          </div>

          <p className="leading-relaxed">
            Enquanto a suspensão durar, você não pode publicar anúncios, enviar mensagens, avaliar
            nem denunciar. Seus anúncios abertos saíram da busca.
          </p>

          <div className="space-y-1.5 rounded-lg bg-muted/50 p-4">
            <p className="font-medium text-sm">Motivo informado pela moderação</p>
            <p className="text-pretty leading-relaxed">{suspension.reason}</p>
            <p className="text-muted-foreground text-xs">
              Suspensa em{" "}
              <time dateTime={suspension.createdAt.toISOString()}>
                {suspension.createdAt.toLocaleDateString("pt-BR")}
              </time>
            </p>
          </div>

          <div className="space-y-2 border-border border-t pt-5">
            <h2 className="font-semibold text-lg tracking-tight">Não concorda?</h2>
            {appeal ? (
              <div className="space-y-2">
                <p className="text-sm leading-relaxed">
                  {appeal.status === "open"
                    ? "Sua contestação está em análise com alguém da moderação que não tomou esta decisão."
                    : appeal.status === "rejected"
                      ? "Sua contestação foi analisada e a decisão foi mantida."
                      : "Sua contestação foi aceita."}
                </p>
                {appeal.resolutionNote && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {appeal.resolutionNote}
                  </p>
                )}
              </div>
            ) : (
              <AppealForm target="suspension" targetId={suspension.id} />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/anuncios">Continuar navegando</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/seguranca">Regras da plataforma</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
