# ADR-0020: Suspensão de contas, restrita à administração

- **Situação:** aceita
- **Data:** 2026-09-05

## Contexto

A [ADR-0018](./0018-canal-de-denuncia-e-moderacao.md) criou a fila de moderação e registrou o que
faltava: acolher a denúncia de um anúncio o arquiva e a de uma avaliação a oculta, mas **uma
conversa abusiva não tem conteúdo a remover**. Contra assédio em mensagem privada, a moderação não
tinha nenhuma consequência a aplicar.

Faltava também uma distinção de papéis. Todo mundo em `moderators` podia tudo o que a moderação
fazia, e suspender uma conta é de outra ordem: tira a pessoa da plataforma inteira. O requisito era
que a suspensão **não ficasse ao alcance de qualquer pessoa** — não que exigisse um papel acima do
de moderador.

## Decisão

**Dois papéis na mesma tabela.** `moderators.role` é `moderator` ou `admin`. Só `admin` suspende e
reativa. É coluna, e não uma segunda tabela, porque as permissões são encaixadas — todo admin é
moderador. Duas tabelas exigiriam mantê-las em sincronia e abririam a chance de um admin sem acesso
à fila.

**A suspensão é histórico, não sinalizador.** Uma coluna booleana em `user` apagaria o motivo e a
data assim que a conta fosse reativada, e `user` é gerenciada pelo Better Auth. A tabela
`suspensions` guarda quem suspendeu, por quê, quando, e o mesmo para a reativação. Uma conta pode
ser suspensa mais de uma vez, e é justamente isso que importa a quem decide a próxima.

**Uma suspensão em vigor por conta, garantida por índice parcial** — `suspensions_active_key`, único
sobre `user_id` onde `lifted_at IS NULL`. Sem ele, dois admins agindo ao mesmo tempo deixariam duas
linhas ativas e reativar resolveria só uma.

**O bloqueio mora em `requireSession`.** Toda página autenticada e **toda Server Action** passam por
ali antes de qualquer escrita. Bloquear nesse ponto cobre publicar, mensagens, avaliações,
denúncias e a própria moderação de uma vez, sem depender de ninguém lembrar de checar caso a caso.
Quem está suspenso é levado a `/conta-suspensa`.

**A suspensão tira o conteúdo do ar.** Anúncios de contas suspensas somem da busca e do perfil
público. Sem isso, uma conta suspensa por golpe continuaria com os anúncios dela no topo da busca —
a suspensão barraria a pessoa e deixaria o dano.

**O motivo é obrigatório e vai inteiro para quem foi suspenso.** Uma suspensão sem justificativa não
dá o que corrigir nem o que contestar. O admin escreve sabendo que o texto será lido pela pessoa.

**Ninguém suspende a si mesmo**, e a ação responde "não encontrada" para quem não é admin — o mesmo
padrão do resto do sistema, que não confirma a existência do que a pessoa não pode acessar.

## Alternativas consideradas

**Coluna `suspended_at` em `user`.** Uma linha de migração e nenhum histórico: sem motivo, sem quem
decidiu, e a reativação apagaria o registro de que houve suspensão.

**Apagar a conta.** Resolve o incidente e destrói o resto: as conversas de quem interagiu com a
pessoa somem por cascata, e as avaliações que ela escreveu sobre terceiros também. Suspender
preserva o que os outros construíram.

**Bloquear na camada do Better Auth, invalidando a sessão.** Expulsaria a pessoa para a tela de
login sem explicação nenhuma — o pior desfecho possível para quem quer entender o que aconteceu.
Manter a sessão viva e barrar as ações permite mostrar o motivo.

**Deixar qualquer moderador suspender.** É uma escolha legítima, e não foi descartada por
princípio: o requisito era que **suspender não ficasse ao alcance de qualquer pessoa**, e tanto
`admin` quanto `moderator` atendem. Ficou em `admin` por ser a leitura mais restritiva do pedido, e
porque separar a ação mais grave do fluxo diário de resolver denúncias reduz a chance de ela ser
tomada no impulso. Passar para `moderator` é trocar `isAdmin` por `isModerator` nas duas ações de
`src/server/actions/suspensions.ts`.

**Suspensão com prazo.** Um `expires_at` daria suspensões temporárias automáticas. Descartado por
ora: exigiria processo agendado ou cálculo em toda leitura, e ainda não há volume que justifique.
A reativação manual cobre o caso.

## Consequências

- `requireSession` passou a consultar o banco em toda requisição autenticada. O custo é uma
  consulta indexada por render, com `cache` do React evitando repetição dentro do mesmo.
- A página `/conta-suspensa` usa `getSession`, e **não** `requireSession`: esta última redireciona
  para lá, e a página entraria em laço consigo mesma.
- A regra "conta suspensa não mostra anúncio" está em dois lugares — a busca e o perfil público. Uma
  listagem nova de anúncios precisa repetí-la.
- **Não existe contestação.** Quem discorda da suspensão não tem caminho na plataforma, e a própria
  página diz isso em vez de fingir que há. Segue no [roteiro](../roadmap.md).
- Suspender não notifica ninguém por fora da plataforma: quem foi suspenso descobre ao tentar
  entrar. Depende do provedor de envio de e-mail que ainda falta.
