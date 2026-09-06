# ADR-0016: Perfil público e avaliações presas a conversas

- **Situação:** aceita
- **Data:** 2026-09-05

## Contexto

Quem encontrava um anúncio não tinha como julgar a pessoa do outro lado. A página do anúncio
mostrava nome e avatar, e nada mais: não havia perfil público — `/painel/perfil` era só o
formulário de edição do próprio dono. O [roteiro](../roadmap.md) já listava **Reputação** como item
de produto, sem desenho definido.

A direção do projeto foi por avaliação com estrelas e comentários, no modelo que as pessoas já
conhecem. A pesquisa de como outras plataformas fazem trouxe três pontos que moldaram o desenho:

- A **OLX** usa 1 a 5 estrelas mais um comentário de até 300 caracteres, e só libera a avaliação
  depois de uma transação confirmada — a avaliação nunca é solta entre duas contas quaisquer.
- Reclamações públicas sobre a OLX apontam o efeito de avaliar sem proteção: quem avalia primeiro
  fica exposto à retaliação de quem avalia depois, e o resultado é nota inflada ou injusta.
- O **Airbnb** resolve isso com janela às cegas: nenhuma das avaliações aparece até que as duas
  cheguem, ou até o prazo de 14 dias vencer.

Havia ainda uma restrição própria da plataforma: sem `listing_images` implementado e com
`fulfilled` marcado unilateralmente pelo autor (`src/components/listing-row-actions.tsx`), não
existe "transação confirmada" para ancorar a avaliação. O que existe é a tabela `conversations`,
com `unique (listing_id, requester_id)`.

## Decisão

**Perfil público em `/membros/[id]`**, com sinais derivados do que a plataforma já registrava:
tempo de casa, cidade e estado, anúncios abertos, taxa e tempo típico de resposta.

**A avaliação fica presa a uma conversa**, e não solta entre dois usuários. A conversa é o único
registro de que duas pessoas de fato se falaram sobre um anúncio. Sem essa âncora, uma fila de
contas novas derrubaria a nota de alguém sem nunca ter trocado uma palavra.

**Só avalia quem conversou de verdade.** É exigido que as duas partes tenham enviado ao menos uma
mensagem. Uma conversa em que só o interessado escreveu não vira avaliação: quem não responde já
aparece na taxa de resposta, e permitir nota ali transformaria a avaliação em punição por silêncio.

**Nota de 1 a 5 e comentário opcional de até 300 caracteres**, seguindo a convenção da OLX.

**Prazo às cegas de 14 dias.** Uma avaliação só se torna pública quando a outra parte também
avalia, ou quando o prazo vence. A regra é resolvida em SQL na leitura, em
`src/server/queries/reviews.ts`, e não por uma tarefa agendada que "publica" no vencimento.

**A avaliação não pode ser editada.** Poder reescrever seria a porta dos fundos do prazo às cegas.

**As invariantes são restrições de banco**, não checagens de aplicação: uma avaliação por pessoa em
cada conversa, nota entre 1 e 5, comentário de até 300 caracteres e ninguém avaliando a si mesmo.

**A taxa de resposta some abaixo de três conversas recebidas**, e um perfil recente é apresentado
como "Novo por aqui". Com uma ou duas conversas, uma única mensagem sem resposta viraria "0% de
resposta", que se lê como acusação e não como medida; e "0 avaliações" lê a ausência de histórico
como histórico ruim, deixando quem acabou de chegar sem a primeira troca.

**A consulta pública lista as colunas explicitamente.** `email`, `latitude`, `longitude` e
`search_radius_meters` estão na mesma junção e ficam de fora: a interface promete cidade e estado,
e devolver as coordenadas daria a posição de casa de quem preencheu o perfil.

## Alternativas consideradas

**Confirmação binária em vez de estrelas** ("recomendo" / "não recomendo"), com um contador de
trocas concluídas. Era a recomendação técnica original: média de estrelas satura perto de 4,8 e
para de discriminar, e nota baixa em plataforma de bairro é pessoal, entre pessoas que se cruzam na
rua. Descartada por decisão de produto — estrelas são o que as pessoas reconhecem, e o custo de
explicar um sistema próprio é real. O risco de saturação segue registrado aqui.

**Avaliação livre entre dois membros, sem âncora.** Simples de implementar e impossível de
defender: qualquer conta poderia avaliar qualquer outra, quantas vezes quisesse.

**Publicação imediata, sem prazo às cegas.** É o que a OLX faz, e é a origem das reclamações de
retaliação encontradas na pesquisa. O custo do prazo é que uma avaliação legítima demora a
aparecer; o benefício é que ela é honesta quando aparece.

**Tarefa agendada para publicar no vencimento.** Exigiria um processo periódico — infraestrutura
nova, contra a premissa de camada gratuita da [ADR-0010](./0010-hospedagem-em-camada-gratuita.md),
e mais uma coisa que falha em silêncio. Calcular na leitura dá o mesmo resultado.

**Permitir edição por um tempo.** Descartada: qualquer janela de edição depois da revelação
reabre a retaliação que o prazo às cegas fecha.

## Consequências

- O predicado de publicação precisa ser aplicado em **toda** consulta que exponha avaliação. Por
  isso ele mora em uma função única, `isPublished()`, em `src/server/queries/reviews.ts`. Uma
  consulta nova que esqueça de usá-lo vaza avaliação no prazo às cegas.
- `getPublicProfile` é fronteira de privacidade. Acrescentar uma coluna ali é decisão de exposição,
  não de conveniência.
- O seed cria uma avaliação de um lado só, recente de propósito: é o caso que exercita o prazo às
  cegas, e some do perfil até vencer.
- Os testes de ponta a ponta criam a própria conta com sufixo único. Contas fixas do seed fariam
  `chromium` e `mobile` disputarem a mesma conversa, pela unicidade
  `(listing_id, requester_id)` — a mesma armadilha de banco compartilhado descrita na
  [ADR-0015](./0015-banco-dedicado-para-testes-de-ponta-a-ponta.md).
- **A reputação ainda repousa sobre contas descartáveis.** `requireEmailVerification` está
  desligado em `src/lib/auth.ts`: criar conta é gratuito e instantâneo, então abandonar uma
  avaliação ruim também é. Enquanto isso não mudar, o sistema pune sobretudo quem age de boa-fé e
  fica. Continua no [roteiro](../roadmap.md).
- **Não há canal de denúncia.** Avaliação não substitui moderação: ela mede quem cumpriu o
  combinado, não remove quem age de má-fé. Segue como o item mais urgente do roteiro.
- `listings.status = 'fulfilled'` continua sendo autodeclaração do autor e **não** é exibido como
  sinal público no perfil. Só os anúncios `open` aparecem.
