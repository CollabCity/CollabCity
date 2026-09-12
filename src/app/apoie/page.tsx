import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PixKey } from "@/components/pix-key";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { env, isDonationEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Apoie o projeto",
  description:
    "O CollabCity é gratuito e continua gratuito. Quem quiser ajudar a pagar a infraestrutura pode contribuir — e quem não puder ajuda do mesmo jeito, usando a plataforma.",
};

/** Ajuda que não custa dinheiro, e que o projeto precisa mais do que de dinheiro. */
const OTHER_WAYS = [
  {
    title: "Responda quem te procura",
    body: "Uma mensagem sem resposta é o que mais desgasta uma plataforma de troca. Responder, mesmo que seja para dizer não, mantém o lugar vivo.",
  },
  {
    title: "Avalie depois da troca",
    body: "A avaliação é o que permite a alguém confiar em um desconhecido da própria cidade. Sem ela, todo mundo recomeça do zero.",
  },
  {
    title: "Denuncie o que estiver errado",
    body: "A moderação não vê o que ninguém aponta. Uma denúncia é mais barata que qualquer servidor.",
  },
  {
    title: "Contribua com código ou tradução",
    body: "O projeto é aberto e aceita correções, funcionalidades e revisão de texto.",
  },
];

export default function SupportPage() {
  // Sem canal configurado não há o que oferecer, e uma página pedindo apoio sem
  // caminho para apoiar é um beco. Quem opera a instância decide se ela existe.
  if (!isDonationEnabled) notFound();

  const url = env.NEXT_PUBLIC_DONATION_URL;
  const pix = env.NEXT_PUBLIC_DONATION_PIX;
  const controller = env.NEXT_PUBLIC_PRIVACY_CONTROLLER;

  return (
    <div className="container-page max-w-3xl space-y-10 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl tracking-tight">Apoie o projeto</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          O CollabCity é gratuito, sem anúncios, e continua assim. Doar é opcional e não muda nada
          no que você recebe aqui.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">Para onde vai o dinheiro</h2>
        <p className="leading-relaxed">
          Hospedagem, banco de dados, armazenamento das fotos e o domínio. Hoje tudo isso cabe em
          camadas gratuitas, e a contribuição serve para o dia em que deixar de caber — quando há
          gente demais usando, que é o problema que se quer ter.
        </p>
        <p className="leading-relaxed">
          {controller ? (
            <>
              Quem recebe é <strong>{controller}</strong>, que opera esta instância.
            </>
          ) : (
            <>
              Quem recebe é <strong>quem opera esta instância</strong>, não o repositório: o
              CollabCity é open source e qualquer pessoa pode hospedar o seu.
            </>
          )}{" "}
          O pagamento acontece fora daqui, no canal abaixo: a plataforma não processa valores e não
          recebe nenhum dado bancário seu.
        </p>
      </section>

      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="font-semibold text-xl tracking-tight">Como apoiar</h2>

          {url && (
            <div className="space-y-2">
              <Button asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Fazer uma doação
                </a>
              </Button>
              <p className="text-muted-foreground text-sm">
                Abre o canal de apoio em uma aba nova, fora do CollabCity.
              </p>
            </div>
          )}

          {pix && (
            <div className="space-y-2">
              <p className="font-medium text-sm">Pix</p>
              <PixKey value={pix} />
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">Doar não compra nada</h2>
        <p className="leading-relaxed">
          Quem contribui <strong>não</strong> ganha destaque na busca, selo no perfil, prioridade no
          atendimento nem qualquer vantagem sobre outra pessoa. Em uma plataforma de ajuda mútua
          isso inverteria o sentido do lugar: quem tem menos dinheiro é frequentemente quem mais
          precisa ser visto.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">Ajudar sem dinheiro</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {OTHER_WAYS.map((way) => (
            <Card key={way.title}>
              <CardContent className="space-y-2 p-5">
                <h3 className="font-medium">{way.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{way.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          O código está no{" "}
          <a
            href="https://github.com/CollabCity/CollabCity"
            className="font-medium underline underline-offset-2"
          >
            GitHub
          </a>
          , e o que a plataforma faz com os seus dados está na{" "}
          <Link href="/privacidade" className="font-medium underline underline-offset-2">
            política de privacidade
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
