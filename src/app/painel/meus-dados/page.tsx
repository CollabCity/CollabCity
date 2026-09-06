import { DownloadIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Meus dados" };

const APAGADO = [
  "Seu perfil, com apresentação, cidade e coordenadas.",
  "Seus anúncios e as fotos deles, inclusive os arquivos no armazenamento.",
  "Seus anúncios salvos.",
  "Suas credenciais e todas as sessões abertas.",
];

const PERMANECE = [
  "As mensagens que você enviou, dentro das conversas de quem conversou com você.",
  "As avaliações que você escreveu sobre outras pessoas.",
  "Registros de moderação, quando existirem: denúncias, suspensões e contestações.",
];

/**
 * Os direitos de acesso, portabilidade e eliminação do art. 18 da LGPD.
 *
 * A página diz, antes de qualquer botão, exatamente o que some e o que fica.
 * Uma exclusão que promete mais do que faz é pior que uma que explica menos.
 */
export default async function MyDataPage() {
  const session = await requireSession();

  return (
    <section className="max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Meus dados</h1>
        <p className="text-muted-foreground text-sm">
          O que a plataforma guarda sobre você, e o que você pode fazer com isso.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="font-semibold text-xl tracking-tight">Baixar meus dados</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Um arquivo JSON com sua conta, perfil, anúncios, conversas, avaliações e registros de
              moderação. Formato aberto, legível por máquina e por gente.
            </p>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            O arquivo não inclui quem denunciou você, nem e-mail ou contato de outras pessoas — elas
            aparecem apenas pelo nome de exibição, que já é público.
          </p>

          <Button asChild>
            {/* `download` não basta: a rota já manda o cabeçalho que faz o
                navegador salvar. O atributo é a dica para o caso de acesso direto. */}
            <a href="/api/meus-dados" download>
              <DownloadIcon />
              Baixar arquivo
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1">
            <h2 className="font-semibold text-xl tracking-tight">Excluir minha conta</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A exclusão é imediata e não tem volta. Baixe seus dados antes, se quiser guardá-los.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-medium text-sm">É apagado</h3>
              <ul className="grid gap-1.5">
                {APAGADO.map((item) => (
                  <li key={item} className="flex gap-2 text-muted-foreground text-sm">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-sm">Permanece, sem o seu nome</h3>
              <ul className="grid gap-1.5">
                {PERMANECE.map((item) => (
                  <li key={item} className="flex gap-2 text-muted-foreground text-sm">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Sua conta passa a aparecer como <strong>Membro removido</strong>. O que permanece é de
            duas pessoas: apagar a conversa inteira ou as avaliações que você escreveu tiraria de
            quem ficou o histórico dela — o seu direito não pode virar a perda de outra pessoa. Dado
            anonimizado deixa de ser dado pessoal.
          </p>

          <DeleteAccountForm email={session.user.email} />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        Sobre o que é coletado e compartilhado, veja{" "}
        <Link href="/privacidade" className="font-medium underline underline-offset-2">
          Privacidade
        </Link>
        .
      </p>
    </section>
  );
}
