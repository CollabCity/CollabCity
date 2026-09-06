# ADR-0017: Aviso de responsabilidade e orientação de segurança

- **Situação:** aceita
- **Data:** 2026-09-05

## Contexto

A plataforma aproxima pessoas que combinam encontros presenciais, empréstimos de objetos e, quando
a troca é `paid`, pagamentos — tudo fora do ambiente do CollabCity, que não intermedia nada disso.
Não havia, em lugar nenhum do produto, texto dizendo isso a quem usa.

Dois fatos delimitaram a redação:

- Em junho de 2025 o **STF declarou o art. 19 do Marco Civil da Internet parcialmente
  inconstitucional**. Um aviso genérico de "não nos responsabilizamos por nada" não é o que
  protege uma plataforma: o que pesa é ela não ter ingerência no negócio e **agir quando
  notificada** de conteúdo ilícito. A jurisprudência sobre plataformas que apenas hospedam anúncios
  (REsp 1.880.344) segue essa linha.
- As orientações de segurança da **OLX** e a cobertura sobre golpes na plataforma convergem em um
  conjunto pequeno e repetido de recomendações: manter a conversa dentro da plataforma, desconfiar
  de preço fora da curva e de urgência, encontrar-se onde haja movimento, adiar o pagamento até ver
  o que se está levando, e não tratar imagem de comprovante como prova de pagamento.

  As recomendações em si são conhecimento comum de segurança e reaparecem em todas as fontes; o que
  não se reaproveita é a redação. O texto de `/seguranca` foi escrito para este projeto, com o
  raciocínio por trás de cada item — as fontes trazem a instrução, aqui vai também o motivo — e
  agrupado pelo momento em que a pessoa consulta, e não em uma lista única.

## Decisão

**Uma página `/seguranca`** com duas partes: o que a plataforma não faz, e como se proteger. As
recomendações estão agrupadas por momento — antes de responder, durante a conversa, no encontro, e
quando envolve dinheiro — porque é assim que a pessoa as consulta.

**Avisos curtos onde a decisão é tomada**, e não só na página: no anúncio, antes do primeiro
contato, e dentro da conversa. Um texto que vive apenas em uma página de termos não é lido por
quem está prestes a combinar um encontro.

**A redação diz o que é verdade e não promete o que não existe.** A plataforma hospeda anúncios e
conversas; não intermedia pagamentos, não confere itens e não verifica identidade. O aviso afirma
que conteúdo ilegal ou abusivo que chegue ao conhecimento do projeto é removido — e não afirma que
há verificação prévia, porque não há.

**O texto se declara insuficiente.** Está escrito, na própria página, que ele explica o
funcionamento do serviço e **não substitui termos de uso nem orientação jurídica**.

**O aviso de "confie no seu desconforto"** fecha a página: interromper o contato é sempre resposta
legítima, e ninguém deve explicação a ninguém para recusar um combinado.

## Alternativas consideradas

**Só termos de uso.** É o caminho usual e o menos eficaz: um documento longo, aceito uma vez no
cadastro e nunca mais lido, não muda o comportamento de quem está marcando um encontro. Os termos
continuam necessários — esta decisão não os substitui.

**Modal de aceite antes do primeiro contato.** Aumentaria a chance de leitura na primeira vez e
viraria ruído a partir da segunda, treinando as pessoas a fechar avisos sem ler. O aviso fixo e
discreto, sempre no mesmo lugar, sobrevive melhor ao uso repetido.

**Isenção ampla de responsabilidade.** Descartada por ser, além de juridicamente frágil no regime
atual, desonesta: a plataforma decide o que hospeda e pode remover o que é abusivo, e escrever que
nada disso é problema dela contradiz o que ela de fato faz.

**Nenhum aviso.** Era o estado anterior. Deixava a pessoa sem a informação mais básica sobre com
quem está tratando e sob que garantias — nenhuma.

## Consequências

- O projeto passa a afirmar publicamente que remove conteúdo ilegal ou abusivo **que chegue ao seu
  conhecimento**. Hoje não existe canal de denúncia: a afirmação só se sustenta quando ele existir,
  e isso reforça a prioridade do item de moderação no [roteiro](../roadmap.md).
- Falta a peça formal. Termos de uso e política de privacidade continuam pendentes, e o texto de
  `/seguranca` precisa de revisão jurídica antes de qualquer uso real — está escrito na página que
  ele não faz esse papel.
- As recomendações vivem em uma lista de dados em `src/app/seguranca/page.tsx`, não espalhadas pelo
  JSX, para que revisá-las seja editar um lugar só.
- O componente `SafetyNotice` tem duas variantes de texto conforme o contexto. Uma superfície nova
  onde se combine algo com outra pessoa deve receber o aviso também.
