import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { isMeasurementEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "O que o CollabCity coleta, o que compartilha e o que você controla.",
};

const SECTIONS = [
  {
    title: "O que a plataforma precisa para funcionar",
    items: [
      "Nome e e-mail, para a sua conta existir. O e-mail nunca aparece no seu perfil público nem para outros membros.",
      "Cidade, estado e coordenadas do perfil, para a busca por proximidade. A interface mostra apenas cidade e estado — as coordenadas ficam no banco e não são devolvidas em nenhuma consulta pública.",
      "O que você publica: anúncios, mensagens, avaliações e denúncias.",
      "Um cookie de sessão, para você continuar logado. Ele é necessário e não depende de consentimento.",
    ],
  },
  {
    title: "O que você controla",
    items: [
      "Medição e publicidade só carregam se você aceitar. Recusar não tira nenhuma funcionalidade.",
      "A escolha fica em um cookie por seis meses e pode ser trocada a qualquer momento pelo link “Cookies e privacidade”, no rodapé.",
      "Você pode editar ou apagar seus anúncios e seu perfil a qualquer momento.",
    ],
  },
  {
    title: "Quem mais vê o quê",
    items: [
      "Seu perfil público mostra nome, cidade, estado, tempo de casa, anúncios abertos, taxa de resposta e avaliações recebidas.",
      "Conversas são privadas entre as duas pessoas. A única exceção é uma conversa denunciada, que a moderação pode ler para avaliar a denúncia — e só depois de existir a denúncia.",
      "Quem você denuncia não vê que foi você.",
    ],
  },
];

export default function PrivacyPage() {
  const measures = isMeasurementEnabled.analytics || isMeasurementEnabled.ads;

  return (
    <div className="container-page max-w-3xl space-y-10 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl tracking-tight">Privacidade</h1>
        <p className="text-muted-foreground leading-relaxed">
          O que a plataforma coleta, por quê, e o que fica sob o seu controle.
        </p>
      </header>

      {measures && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="font-semibold text-xl tracking-tight">Medição e publicidade</h2>
            {isMeasurementEnabled.analytics && (
              <p className="leading-relaxed">
                Usamos o <strong>Google Analytics</strong> para saber quantas pessoas visitam e
                quais páginas usam. Isso envolve enviar dados de navegação ao Google.
              </p>
            )}
            {isMeasurementEnabled.ads && (
              <p className="leading-relaxed">
                Exibimos publicidade pelo <strong>Google AdSense</strong>, que usa cookies próprios
                para escolher e medir os anúncios. Não há publicidade nas páginas de pedido de
                ajuda.
              </p>
            )}
            <p className="leading-relaxed">
              <strong>Nada disso carrega antes de você aceitar.</strong> Se você recusar, os scripts
              não entram na página — não é um sinal de “não me rastreie” enviado a eles, é ausência
              do código.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A base legal aqui é o seu consentimento, na forma do art. 7º, I da LGPD. Como há
              compartilhamento com terceiro, não nos apoiamos em legítimo interesse.
            </p>
          </CardContent>
        </Card>
      )}

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="font-semibold text-2xl tracking-tight">{section.title}</h2>
          <ul className="grid gap-2.5">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2.5 leading-relaxed">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="font-semibold text-2xl tracking-tight">O que ainda falta</h2>
        <p className="leading-relaxed">
          Esta página descreve o funcionamento do serviço e{" "}
          <strong>não substitui uma política de privacidade formal</strong>, que ainda não existe e
          precisa de revisão jurídica. Também não há, por enquanto, exportação automática dos seus
          dados nem exclusão de conta pela interface — os dois estão no roteiro do projeto.
        </p>
        <p className="leading-relaxed">
          Sobre segurança nas negociações, veja{" "}
          <Link href="/seguranca" className="font-medium underline underline-offset-2">
            Segurança e responsabilidade
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
