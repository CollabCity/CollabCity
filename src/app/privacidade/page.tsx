import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { env, isMeasurementEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "O que o CollabCity coleta, com que base legal, com quem compartilha e o que você controla.",
};

/** Sobe quando o conteúdo muda de forma que afete quem já leu. */
const VERSION = "1.0";
const UPDATED_AT = "6 de setembro de 2026";

/** Finalidade e base legal de cada grupo de dados, como a LGPD pede. */
const TREATMENTS = [
  {
    data: "Nome e e-mail",
    purpose: "Criar e manter sua conta, e identificar você para quem conversa com você.",
    basis: "Execução de contrato (art. 7º, V)",
  },
  {
    data: "Senha",
    purpose: "Autenticar seu acesso. É guardada com hash, nunca em texto.",
    basis: "Execução de contrato (art. 7º, V)",
  },
  {
    data: "Cidade, estado e coordenadas do perfil",
    purpose:
      "Ordenar a busca por proximidade. A interface mostra só cidade e estado; as coordenadas nunca saem em consulta pública.",
    basis: "Execução de contrato (art. 7º, V)",
  },
  {
    data: "Anúncios, mensagens e avaliações",
    purpose: "São o serviço em si: publicar, conversar e registrar como foi a troca.",
    basis: "Execução de contrato (art. 7º, V)",
  },
  {
    data: "Denúncias, decisões de moderação e suspensões",
    purpose:
      "Apurar abuso, aplicar as regras da plataforma e sustentar o histórico de quem foi afetado.",
    basis: "Legítimo interesse (art. 7º, IX) e cumprimento de obrigação legal (art. 7º, II)",
  },
  {
    data: "Cookie de sessão",
    purpose: "Manter você conectado entre páginas. É necessário e não depende de consentimento.",
    basis: "Execução de contrato (art. 7º, V)",
  },
  {
    data: "Cookies de medição e publicidade",
    purpose: "Medir audiência e exibir anúncios. Nada carrega antes do seu aceite.",
    basis: "Consentimento (art. 7º, I)",
  },
];

const RIGHTS = [
  ["Confirmação e acesso", "Painel › Meus dados › Baixar arquivo, em JSON."],
  ["Portabilidade", "O mesmo arquivo, em formato aberto e legível por máquina."],
  ["Correção", "Painel › Perfil, e a edição de cada anúncio."],
  [
    "Eliminação",
    `Painel › Meus dados › Excluir minha conta. O conteúdo sai do ar na hora e o apagamento acontece depois de ${env.ACCOUNT_DELETION_GRACE_DAYS} dias, prazo em que você pode voltar atrás.`,
  ],
  ["Revogação do consentimento", "“Cookies e privacidade”, no rodapé, a qualquer momento."],
  [
    "Informação sobre compartilhamento",
    "A seção “Com quem compartilhamos” abaixo lista todos os terceiros.",
  ],
];

export default function PrivacyPage() {
  const controller = env.NEXT_PUBLIC_PRIVACY_CONTROLLER;
  const contact = env.NEXT_PUBLIC_PRIVACY_CONTACT;
  const measures = isMeasurementEnabled.analytics || isMeasurementEnabled.ads;

  return (
    <div className="container-page max-w-3xl space-y-10 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl tracking-tight">Política de privacidade</h1>
        <p className="text-muted-foreground text-sm">
          Versão {VERSION} · atualizada em {UPDATED_AT}
        </p>
        <p className="leading-relaxed">
          Esta política explica quais dados o CollabCity trata, para quê, com que base legal, com
          quem compartilha e o que você pode exigir. Ela segue a Lei Geral de Proteção de Dados (Lei
          13.709/2018).
        </p>
      </header>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="font-semibold text-xl tracking-tight">Quem é o controlador</h2>
          {controller ? (
            <p className="leading-relaxed">
              <strong>{controller}</strong> opera esta instância e é o controlador dos dados
              tratados aqui.
              {contact && (
                <>
                  {" "}
                  Pedidos relacionados a esta política vão para{" "}
                  <a
                    href={`mailto:${contact}`}
                    className="font-medium underline underline-offset-2"
                  >
                    {contact}
                  </a>
                  .
                </>
              )}
            </p>
          ) : (
            <p className="leading-relaxed">
              O CollabCity é um projeto open source que qualquer pessoa pode hospedar, e{" "}
              <strong>o controlador é quem opera cada instância</strong> — não o repositório.{" "}
              <strong>Quem roda esta instância ainda não se identificou.</strong> Enquanto isso não
              acontecer, trate este ambiente como demonstração e não publique dados que você não
              queira expor. Quem hospeda deve preencher a identificação e o canal de contato antes
              de receber pessoas de verdade.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">O que tratamos, e por quê</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="py-2 pr-4 font-medium">Dado</th>
                <th className="py-2 pr-4 font-medium">Finalidade</th>
                <th className="py-2 font-medium">Base legal</th>
              </tr>
            </thead>
            <tbody>
              {TREATMENTS.map((treatment) => (
                <tr key={treatment.data} className="border-border/60 border-b align-top">
                  <td className="py-3 pr-4 font-medium">{treatment.data}</td>
                  <td className="py-3 pr-4 leading-relaxed">{treatment.purpose}</td>
                  <td className="py-3 text-muted-foreground leading-relaxed">{treatment.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Não tratamos dados sensíveis na definição do art. 5º, II, e não pedimos documento, dado
          bancário nem informação de saúde. Se você escrever algo assim em um anúncio ou mensagem,
          isso passa a existir na plataforma — por isso a página de{" "}
          <Link href="/seguranca" className="font-medium underline underline-offset-2">
            segurança
          </Link>{" "}
          recomenda não fazê-lo.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">Com quem compartilhamos</h2>
        <ul className="grid gap-2.5">
          <li className="flex gap-2.5 leading-relaxed">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <strong>Outros membros.</strong> Seu nome, cidade, estado, tempo de casa, anúncios
              abertos, taxa de resposta e avaliações recebidas ficam no seu perfil público. Seu
              e-mail e suas coordenadas, não.
            </span>
          </li>
          <li className="flex gap-2.5 leading-relaxed">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <strong>A moderação.</strong> Uma conversa privada só é lida quando existe denúncia
              apontando para ela, e apenas por quem modera.
            </span>
          </li>
          {measures && (
            <li className="flex gap-2.5 leading-relaxed">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                <strong>Google.</strong> Se você aceitar, dados de navegação vão para o Google
                Analytics e para o AdSense, o que envolve{" "}
                <strong>transferência internacional</strong> para os Estados Unidos. Recusar não
                tira nenhuma funcionalidade, e nada carrega antes do aceite.
              </span>
            </li>
          )}
          <li className="flex gap-2.5 leading-relaxed">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              <strong>Autoridades</strong>, quando houver ordem judicial ou obrigação legal.
            </span>
          </li>
        </ul>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Não vendemos dados pessoais, e não os cedemos para uso comercial de terceiros fora do que
          está descrito acima.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">Por quanto tempo guardamos</h2>
        <p className="leading-relaxed">
          Enquanto sua conta existir. Ao excluí-la, seu perfil, seus anúncios e as fotos deles são
          apagados; mensagens e avaliações permanecem <strong>sem o seu nome</strong>, porque
          pertencem também a quem estava do outro lado — apagá-las tiraria dessa pessoa o histórico
          dela. Dado anonimizado deixa de ser dado pessoal (art. 12). Registros de moderação são
          mantidos pelo mesmo motivo.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">Seus direitos, e onde exercê-los</h2>
        <p className="leading-relaxed">
          O art. 18 da LGPD garante os direitos abaixo. Todos são exercíveis pela própria interface,
          sem depender de pedido por e-mail:
        </p>
        <dl className="grid gap-3">
          {RIGHTS.map(([right, where]) => (
            <div key={right} className="grid gap-0.5">
              <dt className="font-medium text-sm">{right}</dt>
              <dd className="text-muted-foreground text-sm leading-relaxed">{where}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">Segurança</h2>
        <p className="leading-relaxed">
          Senhas com hash, sessões com prazo, autorização verificada em cada escrita, limites de
          taxa contra abuso e cabeçalhos de segurança no servidor. Nenhuma medida elimina risco: se
          houver incidente com risco relevante, comunicaremos os titulares e a ANPD, como manda o
          art. 48.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">Idade mínima</h2>
        <p className="leading-relaxed">
          A plataforma não se destina a menores de 18 anos e não verifica idade. Se identificarmos
          conta de criança ou adolescente sem consentimento de quem responde por ela, a conta é
          removida.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl tracking-tight">Mudanças nesta política</h2>
        <p className="leading-relaxed">
          A versão e a data no topo mudam a cada alteração. Quando a mudança afetar o que é coletado
          sob consentimento, o aviso de cookies volta a perguntar em vez de reaproveitar uma
          permissão dada para outra descrição.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Este texto foi escrito para descrever com honestidade o que o código faz, e{" "}
          <strong>não substitui a revisão de um advogado</strong> antes de uso comercial. O
          histórico de alterações fica no repositório do projeto.
        </p>
      </section>
    </div>
  );
}
