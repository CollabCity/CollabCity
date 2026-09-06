import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Segurança",
  description:
    "O que o CollabCity faz e o que não faz, e como se proteger ao combinar uma troca com outra pessoa.",
};

/** Cada bloco vira uma seção com a mesma estrutura; o conteúdo fica aqui, junto. */
const PRECAUTIONS = [
  {
    title: "Antes de responder",
    items: [
      "Abra o perfil de quem publicou. Há quanto tempo a pessoa está aqui, quantos anúncios mantém, com que frequência responde e o que dizem as avaliações que recebeu.",
      "Desconfie de oferta boa demais. Um item muito abaixo do valor de mercado, ou uma ajuda grande oferecida sem motivo, costuma ser isca.",
      'Desconfie de pressa. Urgência ("só até hoje", "tem outra pessoa interessada") existe para impedir que você confira as coisas com calma.',
      "Procure a foto do anúncio em uma busca reversa de imagens. Anúncio clonado costuma usar foto tirada de outro lugar da internet.",
    ],
  },
  {
    title: "Durante a conversa",
    items: [
      "Converse pelo CollabCity. Se a conversa migra para outro aplicativo logo de cara, some o registro do que foi combinado — e é justamente o que quem age de má-fé quer.",
      "Não compartilhe documentos, dados bancários, senhas nem códigos recebidos por SMS. Nenhuma parte da plataforma pede isso, e ninguém precisa disso para combinar uma troca.",
      "Peça detalhes que só quem tem o item saberia: uma foto nova, de um ângulo específico, com algo escrito à mão ao lado.",
    ],
  },
  {
    title: "No encontro",
    items: [
      "Escolha um ponto com gente em volta e prefira a luz do dia: a porta de um mercado, o saguão de um prédio público, uma praça em horário de movimento.",
      "Leve companhia quando der. Quando não der, avise alguém de confiança do endereço, do horário e de quem você vai encontrar.",
      "Confira o que está sendo trocado antes de fechar. Depois de cada um seguir seu caminho, não há como voltar atrás.",
    ],
  },
  {
    title: "Se algo já deu errado",
    items: [
      "Denuncie. Todo anúncio, avaliação e conversa tem um botão Denunciar; a denúncia vai para a moderação com o que você escrever, e quem foi denunciado não vê quem denunciou.",
      "Guarde as conversas antes de qualquer coisa. Elas ficam registradas na plataforma e são o que sustenta a sua versão.",
      "Denúncia não é polícia. Ela tira o conteúdo do ar; não recupera dinheiro nem responde a ameaça. Havendo crime, registre boletim de ocorrência.",
    ],
  },
  {
    title: "Se envolver dinheiro",
    items: [
      "O CollabCity não processa pagamentos, não retém valores e não tem como devolver nada. Qualquer pagamento acontece inteiramente fora da plataforma, por conta e risco de quem paga.",
      "Dinheiro por último. Enquanto você não viu o que está levando, quem pede transferência antecipada está pedindo confiança que ainda não construiu.",
      "Comprovante enviado por imagem não é prova de pagamento — imagem se edita. Confira o saldo na sua própria conta antes de entregar qualquer coisa.",
    ],
  },
];

export default function SafetyPage() {
  return (
    <div className="container-page max-w-3xl space-y-10 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl tracking-tight">Segurança e responsabilidade</h1>
        <p className="text-muted-foreground leading-relaxed">
          O CollabCity aproxima pessoas que moram perto umas das outras. O que acontece a partir do
          primeiro contato é combinado diretamente entre elas — e esta página explica o que isso
          significa na prática.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="font-semibold text-xl tracking-tight">O que o CollabCity não faz</h2>
          <p className="leading-relaxed">
            A plataforma <strong>hospeda anúncios e conversas</strong>. Ela não participa das
            negociações, não intermedia pagamentos, não transporta nem guarda itens, não confere se
            o que foi anunciado existe ou está em boas condições, e não verifica a identidade de
            quem se cadastra.
          </p>
          <p className="leading-relaxed">
            Cada pessoa é responsável pelo que publica e pelo que combina.{" "}
            <strong>
              O CollabCity não garante o resultado de nenhuma troca e não se responsabiliza por
              prejuízo, dano ou perda decorrente do que for combinado entre membros
            </strong>
            , inclusive pagamentos feitos fora da plataforma.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Isso não transforma a plataforma em terra de ninguém: conteúdo ilegal ou abusivo que
            chegue ao nosso conhecimento é removido, e o botão <strong>Denunciar</strong> em
            anúncios, avaliações e conversas é o caminho para que chegue. Este texto explica o
            funcionamento do serviço e não substitui os termos de uso nem orientação jurídica.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-8">
        <h2 className="font-semibold text-2xl tracking-tight">Como se proteger</h2>
        {PRECAUTIONS.map((block) => (
          <div key={block.title} className="space-y-3">
            <h3 className="font-semibold text-lg tracking-tight">{block.title}</h3>
            <ul className="grid gap-2.5">
              {block.items.map((item) => (
                <li key={item} className="flex gap-2.5 leading-relaxed">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-2xl tracking-tight">Confie no seu desconforto</h2>
        <p className="leading-relaxed">
          Se algo na conversa parecer estranho, você não deve explicação a ninguém: interrompa o
          contato. Nenhuma troca vale um risco à sua segurança — e recusar um combinado é sempre uma
          resposta legítima.
        </p>
        <p className="leading-relaxed">
          Em caso de crime, registre boletim de ocorrência na delegacia da sua cidade ou na
          delegacia eletrônica do seu estado. Guarde as conversas: elas ficam registradas em{" "}
          <Link href="/mensagens" className="font-medium underline underline-offset-2">
            Mensagens
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
