# ADR-0022: Medição e publicidade com consentimento

- **Situação:** aceita
- **Data:** 2026-09-06

## Contexto

O projeto precisa de uma fonte de receita, e a direção escolheu Google Analytics e Google AdSense.
Antes de implementar, dois pontos foram levantados e decididos.

O primeiro é a base legal. O [guia de cookies da ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias-periodo-eleitoral/anpd-lanca-guia-orientativo-201ccookies-e-protecao-de-dados-pessoais201d)
(out/2022) **não proíbe** apoiar métricas em legítimo interesse, mas condiciona: essa base se
sustenta quando os dados são anonimizados e não vão para terceiros. Não é o caso — o Analytics
envia dados ao Google e o AdSense usa cookies de publicidade. Com compartilhamento com terceiro, o
consentimento é a base segura.

O segundo é o retorno esperado. No Brasil, nicho geral paga na faixa de R$ 2 a R$ 8 por mil
visualizações; a R$ 5 de RPM, mil reais por mês exigem duzentas mil visualizações. Uma plataforma
hiperlocal de ajuda mútua não tem esse tráfego, e alternativas de melhor encaixe — anúncio
destacado e plano de organizações — foram apresentadas e ficam para depois. A decisão de começar
por publicidade é de produto e está registrada como tal.

## Decisão

**Nada carrega antes da escolha.** Não é o Consent Mode do Google, que carrega a biblioteca com
sinais negados: aqui a tag simplesmente não entra na página. É mais fácil de auditar — ou o script
está no HTML, ou não está — e não depende de a biblioteca respeitar um sinal.

**A escolha vive em cookie, não em `localStorage`**, para que o servidor também a enxergue. Quem
recusou não recebe nem o espaço reservado do anúncio na marcação.

**Recusar e aceitar têm o mesmo tamanho e a mesma variante.** Um "aceitar" preenchido ao lado de um
"recusar" contornado já é um empurrão, e o guia pede que recusar seja tão fácil quanto aceitar. Há
teste travando isso: ele compara as classes dos dois botões.

**A escolha é versionada.** `CONSENT_VERSION` sobe quando o que se coleta muda, e uma escolha feita
sob a versão anterior deixa de valer — em vez de herdar um "sim" dado para outra descrição.

**Sem publicidade em página de pedido.** Anúncio de `intent=need` e busca filtrada por pedidos não
recebem publicidade. Quem pede um notebook doado não vira inventário de anunciante; a monetização
fica onde há intenção comercial.

**Sem as variáveis de ambiente, nada existe** — nem os scripts, nem o banner. É o padrão em
desenvolvimento, e evita pedir permissão para coisa nenhuma.

**Uma página `/privacidade`** descreve o que é coletado, o que é compartilhado e o que a pessoa
controla. Um banner sem essa página é consentimento sem informação.

## Alternativas consideradas

**Legítimo interesse, sem banner.** Defensável no papel e frágil aqui: o teste de balanceamento
fica difícil de sustentar quando os dados vão para o Google e há perfilamento publicitário.

**Consent Mode v2 do Google.** É o caminho recomendado pelo próprio Google e mantém a medição
parcial de quem recusa. Descartado por auditabilidade: exige confiar que a biblioteca respeita os
sinais, e a verificação vira "o Google está honrando o que prometeu?" em vez de "a tag está na
página?".

**Analytics sem cookie — Plausible ou Umami.** Dispensaria o banner inteiro, por cair no caso
anonimizado e sem terceiro. Não foi adotado porque a publicidade exige consentimento de qualquer
forma, e um banner que já existe torna o custo do GA marginal. Continua sendo a escolha certa se a
publicidade for retirada.

**Publicidade em todas as páginas.** Renderia mais e monetizaria a exposição de quem está pedindo
ajuda. Descartado.

## Consequências

- O banner é fixo no rodapé e **intercepta cliques**. Todos os estados de sessão dos testes de
  ponta a ponta carregam um consentimento já respondido (`CONSENT_COOKIE_STATE`); sem isso ele
  apareceria em cada teste e viraria falha de suíte. O teste do próprio banner usa um estado
  deliberadamente vazio.
- A leitura do cookie torna o layout raiz dinâmico. Na prática não muda nada: `getSession` já lia
  cabeçalhos em toda página.
- A escolha recarrega a página, porque quem decide o que renderizar é o servidor. Sem recarregar,
  quem aceitou continuaria sem anúncios até a próxima navegação.
- **Não há política de privacidade formal.** A página `/privacidade` descreve o funcionamento e diz
  de si mesma que não substitui o documento, que precisa de revisão jurídica.
- Faltam exportação e exclusão de conta pela interface — dois direitos da LGPD que a plataforma
  ainda não atende. Estão no roteiro.
