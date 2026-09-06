# ADR-0018: Canal de denúncia e fila de moderação

- **Situação:** aceita
- **Data:** 2026-09-05

## Contexto

A [ADR-0017](./0017-aviso-de-responsabilidade-e-seguranca.md) colocou na página `/seguranca` a
afirmação de que conteúdo ilegal ou abusivo **que chegue ao conhecimento do projeto é removido** —
e registrou como consequência que não existia o canal que faz chegar. A afirmação estava a
descoberto.

Ela importa além do produto. Desde que o STF declarou o art. 19 do Marco Civil parcialmente
inconstitucional, o que sustenta a posição de uma plataforma que apenas hospeda anúncios não é uma
isenção genérica, e sim não ter ingerência no negócio **e agir quando notificada**. Sem canal de
notificação, não há o que agir.

A [ADR-0016](./0016-avaliacoes-presas-a-conversas.md) acrescentou uma segunda urgência: com
avaliações no ar, uma nota injusta passou a ser um dano possível, e não havia como contestá-la.

## Decisão

**Denúncia em três superfícies**, que são os três lugares onde existe conteúdo escrito por
membros: anúncio, avaliação e conversa. Um botão em cada um, no lugar onde o conteúdo é lido.

**O alvo é apontado por três chaves estrangeiras**, e não por um par `(tipo, id)` genérico. Custa
três colunas e paga com integridade real: o banco garante que o alvo existe, e apagar um anúncio
leva junto as denúncias sobre ele. Um `CHECK` garante que exatamente uma das três está preenchida.

**Uma denúncia por pessoa em cada alvo**, por restrição de unicidade. Como o Postgres não considera
dois `NULL` iguais, uma restrição por coluna de alvo resolve os três casos.

**Ninguém denuncia o próprio conteúdo**, e **só participante denuncia uma conversa**. A segunda
regra não é conveniência: sem ela, bastaria adivinhar um identificador para submeter uma conversa
alheia à leitura da moderação.

**Moderador é uma linha em `moderators`**, tabela própria — não uma coluna em `user`, pelo mesmo
motivo de `profiles`: aquela tabela é gerenciada pelo Better Auth e pode mudar entre versões.
Conceder e revogar viram `INSERT` e `DELETE`, sem migração.

**A fila mostra as denúncias mais antigas primeiro.** Ordenar pelas recentes deixaria as antigas
envelhecerem para sempre no fundo.

**Acolher aplica a consequência que cabe ao alvo**, e a consequência aparece escrita antes do
clique: anúncio vai para `archived` e sai da busca; avaliação é **ocultada** e deixa de contar na
média; conversa não tem conteúdo a remover e a decisão é apenas registrada.

**Ocultar, e não apagar, a avaliação acolhida.** Além de auditável e reversível, é o que torna a
operação possível: `reports.review_id` tem `ON DELETE CASCADE`, então apagar a avaliação apagaria
a própria denúncia que a motivou, no meio da transação que a estava resolvendo.

**A conversa denunciada é legível pela moderação**, atrás de um clique explícito, e apenas quando
existe denúncia apontando para ela. A moderação não navega pelas conversas da plataforma: ela
responde ao pedido de alguém que estava lá dentro.

**A área de moderação responde 404 para quem não modera**, e não 403 — como o resto do sistema.
Esconder o link do painel não é controle de acesso; a página repete a verificação.

## Alternativas consideradas

**Denúncia por e-mail.** Um endereço em `/seguranca` seria a implementação mais barata. Descartada
porque perde tudo o que dá contexto: qual conteúdo, quem denunciou, o que já foi decidido. A fila
acabaria em uma caixa de entrada, sem estado e sem histórico.

**Coluna polimórfica `(target_type, target_id)`.** Uma coluna a menos e nenhuma integridade
referencial: nada impediria uma denúncia apontando para um identificador que não existe, e apagar
um anúncio deixaria linhas órfãs. A economia não compensa.

**Apagar o conteúdo acolhido.** Some o histórico, a decisão fica irreversível, e no caso das
avaliações a cascata apagaria a própria denúncia. Arquivar e ocultar fazem o mesmo efeito visível.

**Suspender contas.** É a consequência que falta para denúncias de conversa, e exige mais do que
esta decisão comporta — bloqueio de sessão, o que acontece com o conteúdo já publicado, e como se
contesta. Fica no [roteiro](../roadmap.md).

**Denúncia sem estar autenticado.** Ampliaria o alcance e abriria a fila a ruído automatizado, sem
identidade para limitar por taxa. Descartada; a contrapartida é que quem não tem conta não denuncia.

## Consequências

- A afirmação de `/seguranca` passou a ter lastro, e a página agora aponta o caminho.
- A moderação lê conversas privadas denunciadas. É a única porta pela qual alguém de fora as lê,
  ela exige as duas condições ao mesmo tempo — ser moderador e existir denúncia para aquela
  conversa — e está concentrada em `getReportedConversation`. Qualquer consulta nova que exponha
  mensagens precisa da mesma cautela.
- `isPublished()`, em `src/server/queries/reviews.ts`, passou a excluir avaliações ocultadas. É o
  mesmo ponto único por onde já passava o prazo às cegas.
- **A suíte de ponta a ponta deixou de autenticar em cada teste.** Os testes novos empurraram o
  total para além do limite do Better Auth de 10 logins por minuto **por IP**, e a suíte inteira
  sai de um IP só. A correção foi um projeto `setup` que autentica uma vez e salva a sessão, e não
  afrouxar o limite — ele está certo. Ver `e2e/accounts.ts`.
- Não há aviso a quem denunciou sobre o desfecho, nem a quem foi denunciado sobre a decisão. Os
  dois dependem do provedor de envio de e-mail que ainda falta.
- Continua sem existir contestação de uma decisão de moderação. Quem discorda não tem para onde ir.
