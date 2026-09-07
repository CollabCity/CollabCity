# ADR-0024: Prazo de arrependimento e política de privacidade

- **Situação:** aceita
- **Data:** 2026-09-06

## Contexto

A [ADR-0023](./0023-exportacao-e-exclusao-de-conta.md) entregou a exclusão de conta e registrou
duas pendências: a exclusão era **imediata**, sem chance de voltar atrás, e a página
`/privacidade` era um texto explicativo que dizia de si mesmo não ser uma política.

Exclusão imediata protege o direito e não protege a pessoa. Um clique errado, ou uma decisão tomada
em cinco minutos ruins, apagava perfil, anúncios e fotos sem retorno.

A política, por sua vez, esbarrava numa pergunta que o projeto não tinha respondido: **quem é o
controlador?** O CollabCity é open source e auto-hospedável, então não existe um controlador único.

## Decisão

**A exclusão passa a ser agendada.** O pedido cria uma linha em `account_deletions` com data de
vencimento; o expurgo acontece quando ela chega. O prazo padrão é de **30 dias** — curto o bastante
para não adiar um direito, longo o bastante para caber um arrependimento.

**O conteúdo sai do ar na hora.** Anúncios de quem pediu exclusão deixam a busca e o perfil
imediatamente, com o mesmo predicado que já escondia os de contas suspensas. Quem pediu para sumir
começa a sumir agora; o que espera é o apagamento definitivo.

**A sessão acaba junto com o pedido.** Para cancelar, é preciso entrar de novo — o que é, por si,
uma confirmação de que a conta é sua.

**Um pedido em aberto por conta**, por índice parcial, como em `suspensions`. Dois envios seguidos
criariam duas datas, e cancelar resolveria só uma.

**O expurgo é uma rota chamada de fora, não um processo agendado interno.** A premissa de camada
gratuita da [ADR-0010](./0010-hospedagem-em-camada-gratuita.md) não comporta mais um serviço, e um
temporizador interno rodaria uma vez por réplica. Sem segredo configurado a rota **não existe** —
responde 404, e não "não autorizado", porque um endereço destrutivo que responde 401 já confirma
que está ali. A comparação do segredo é de tempo constante.

**Quem chama é o cron da Vercel**, declarado em `vercel.json`, porque a ADR-0010 já elege a Vercel
como plataforma de referência. A rota aceita `GET` além de `POST` porque é assim que a Vercel
invoca, e aceita `CRON_SECRET` além de `MAINTENANCE_SECRET` porque é o nome que a plataforma injeta
no cabeçalho — configurar a mesma senha com dois nomes seria convite a divergirem.

**A esteira do GitHub fica como alternativa**, para quem hospeda em outro lugar. Ela não é o
caminho principal por um motivo concreto: o GitHub **desativa workflows agendados em repositórios
públicos após 60 dias sem commits**, e só commit reinicia o contador. Num projeto que fique quieto
dois meses, as exclusões parariam sem qualquer sinal dentro da aplicação.

**O prazo é configurável** (`ACCOUNT_DELETION_GRACE_DAYS`). A escolha é de quem opera, e zero
desliga o arrependimento — o que só faz sentido em teste, e é o que permite exercitar o expurgo sem
esperar trinta dias.

### Sobre a política de privacidade

**O controlador é quem opera a instância**, e a política diz isso. O projeto é auto-hospedável: o
repositório não trata dado de ninguém. `NEXT_PUBLIC_PRIVACY_CONTROLLER` e
`NEXT_PUBLIC_PRIVACY_CONTACT` identificam quem opera; **sem eles a página declara publicamente que
o operador não se identificou** e orienta a tratar o ambiente como demonstração.

**A política é estruturada como a LGPD pede**: finalidade e base legal de cada grupo de dados em
tabela, compartilhamento com terceiros nomeados, transferência internacional declarada, prazo de
retenção, direitos do art. 18 com **o lugar exato onde cada um se exerce**, segurança, idade mínima
e versionamento com data.

**Ela é honesta sobre o que não faz**: não substitui a revisão de um advogado antes de uso
comercial, e isso está escrito na própria página.

## Alternativas consideradas

**Manter a exclusão imediata.** É a leitura mais literal do art. 18, VI, e a que mais machuca quem
clicou errado. O prazo não nega o direito: adia a execução por um período declarado, com o efeito
visível — o conteúdo fora do ar — começando na hora.

**Prazo sem tirar o conteúdo do ar.** Seria mais simples e surpreendente: a pessoa clica em
"excluir" e os anúncios dela seguem na busca por trinta dias.

**Processo agendado dentro da aplicação.** Um `setInterval` no servidor funciona em uma instância e
falha em duas — cada réplica rodaria o expurgo — e não roda em hospedagem serverless.

**Inventar um controlador na política.** Escrever um nome, um CNPJ ou um endereço para preencher a
seção seria fabricar um registro. Declarar a ausência é menos elegante e verdadeiro.

**Política genérica de modelo.** Preencher um modelo pronto daria uma página com aparência jurídica
descrevendo um sistema que não é este. A política foi escrita a partir do que o código faz.

## Consequências

- **Sem o agendador configurado, nenhuma exclusão é executada.** A linha fica pendente para sempre,
  e a pessoa acredita que foi excluída. O `.env.example` avisa, o `docs/deployment.md` traz o passo
  como obrigatório, e o workflow do GitHub não falha em silêncio: sem os segredos, ele registra que
  não fez nada. Nada disso substitui verificar depois do primeiro deploy.
- A regra "conta inativa não mostra anúncio" agora cobre dois casos, suspensão e exclusão
  pendente, em dois lugares — a busca e o perfil público. Uma listagem nova precisa repetí-la.
- `ACCOUNT_DELETION_GRACE_DAYS=0` desliga o arrependimento. É configuração de teste, e um deploy com
  esse valor tornaria toda exclusão imediata sem que ninguém percebesse.
- Os testes de suspensão e de exclusão passaram a rodar em **um projeto só**. Os dois mexem em
  estado global do banco — uma suspensão ativa por conta, um expurgo que varre todas as vencidas —
  e em paralelo derrubavam um ao outro.
- A política tem versão e data. Mudanças que afetem o que se coleta sob consentimento devem subir
  também `CONSENT_VERSION`, para que o aviso volte a perguntar.
