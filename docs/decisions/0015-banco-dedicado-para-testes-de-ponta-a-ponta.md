# ADR-0015: Banco dedicado para os testes de ponta a ponta

- **Situação:** aceita
- **Data:** 2026-09-04

## Contexto

O anúncio "Empresto ferramentas de jardinagem no fim de semana" aparecia quatro vezes na home, na
busca e no painel. Não era defeito de renderização: eram quatro linhas distintas no banco de
desenvolvimento, criadas em 28/08 às 00:27 e às 00:44, em pares separados por dois segundos.

O par e o intervalo entregam a origem. O último teste de `e2e/autenticacao.spec.ts` publica um
anúncio pela interface, e a suíte roda dois projetos — `chromium` e `mobile`. Duas execuções, dois
projetos cada, quatro linhas. O seed insere 18 anúncios; o banco tinha 22.

A causa é estrutural, não um descuido de quem rodou:

1. **A suíte escrevia no banco de quem desenvolve.** O `webServer` do Playwright subia
   `pnpm build && pnpm start` sem nenhuma variável de ambiente própria, e o Next lê `.env.local` —
   o mesmo arquivo, o mesmo banco do `pnpm dev`. O atalho documentado para o ciclo rápido
   (`E2E_BASE_URL=http://localhost:3000`) apontava para o mesmo lugar.
2. **Nada removia o que a suíte criava.** Não havia limpeza, e o seed só roda quando alguém pede.
   Cada execução somava linhas permanentemente: os contadores da home, os resultados da busca e o
   painel iam se afastando do estado que o seed descreve.
3. **`src/db/seed.ts` trunca todas as tabelas de domínio sem nenhuma verificação de alvo.** Ele
   obedece a `DATABASE_URL`, qualquer que seja. Um `E2E_DATABASE_URL` mal apontado — ou um
   `DATABASE_URL` exportado no shell — apagaria o banco errado em silêncio, e o sintoma que
   apareceria depois, anúncios sumindo, não levaria ninguém até o seed.

Um teste que deixa o sistema diferente de como o encontrou não é repetível, e este deixava resíduo
no banco de trabalho de quem o rodou.

## Decisão

Os testes de ponta a ponta rodam contra um **banco separado, recriado a cada execução**.

- O alvo é derivado do banco de desenvolvimento com o sufixo `_e2e` — `collabcity` vira
  `collabcity_e2e`. Derivar em vez de exigir configuração mantém `pnpm test:e2e` funcionando sem
  passo novo. `E2E_DATABASE_URL` sobrescreve para quem precisa de outro alvo.
- `e2e/prepare-database.ts` cria o banco se não existir, migra e roda o seed. Ele é o **primeiro
  elo do comando do `webServer`**, não um `globalSetup`. A razão é medida, não teórica: o Playwright
  sobe o `webServer` antes do setup global, e a sonda de prontidão carrega a página inicial, que
  consulta o banco. Com a preparação no `globalSetup`, o servidor subia contra um banco inexistente,
  respondia 500 e a suíte expirava esperando um 200 que nunca vinha.
- O servidor sob teste sobe na **porta 3100**, não na 3000. `reuseExistingServer` fica ligado fora
  da CI; com o `pnpm dev` ocupando a 3000, o Playwright reusaria o servidor de desenvolvimento —
  que fala com o banco de desenvolvimento — e o isolamento seria ignorado em silêncio.
  `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL` acompanham a porta.
- **Uma guarda recusa o banco de desenvolvimento como alvo**, comparando com o `DATABASE_URL` lido
  de `.env.local`. É a proteção que faltava ao seed.
- O teste que publica usa **título único por projeto**. `chromium` e `mobile` rodam em paralelo
  contra o mesmo banco; com título fixo, a asserção de um poderia casar com o anúncio do outro.
- `e2e/` entrou no `tsconfig.json`. O diretório estava excluído, e o arquivo que trunca banco seria
  justamente o que nenhuma verificação de tipos cobriria.

## Alternativas consideradas

**Limpar depois de cada teste.** Um `afterEach` removendo o que o caso criou. Não resolve o
essencial: a suíte continuaria escrevendo no banco de quem desenvolve, e uma execução interrompida
— `Ctrl+C`, falha de asserção antes da limpeza — deixaria resíduo do mesmo jeito.

**Repopular o banco de desenvolvimento antes da suíte.** Deixaria a suíte determinística, mas
apagaria o estado de quem estivesse testando à mão. Trocaria resíduo por perda de trabalho, o que
é pior.

**Transação revertida por caso.** Funciona bem para teste de integração no mesmo processo. Não se
aplica aqui: o servidor sob teste é outro processo, com outro pool de conexões, e não há transação
compartilhada entre o navegador e o banco.

**Container Postgres separado só para teste.** Isolamento maior — outro `service` no
`docker-compose.yml`, outra porta. Custa mais tempo de subida na CI e mais uma peça para explicar a
quem chega. Um banco a mais no mesmo servidor dá o mesmo isolamento lógico, que é o que estava
faltando.

## Consequências

- `pnpm test:e2e` não toca mais no banco de desenvolvimento. Verificado: com 22 anúncios antes, a
  suíte completa (22 testes, dois projetos) passou e o banco continuou com 22, enquanto
  `collabcity_e2e` terminou com 20 — os 18 do seed mais um anúncio por projeto.
- A suíte ficou repetível: cada execução parte do mesmo estado, então asserções sobre contagem e
  sobre a primeira página de resultados passam a ser confiáveis.
- Toda execução paga migração e seed do banco de teste. São segundos, e é o preço de partir de um
  estado conhecido.
- A CI deixou de migrar, popular e compilar à mão no job de ponta a ponta: o `webServer` faz os
  três com as variáveis certas. Antes, o build do job usava `NEXT_PUBLIC_APP_URL` de uma porta e era
  descartado pelo build do `webServer` logo em seguida.
- O ciclo rápido com servidor próprio mudou. Não basta mais `E2E_BASE_URL`: o servidor precisa
  subir apontando para o banco de teste. `pnpm db:e2e` prepara o banco, e
  [`testing.md`](../testing.md) traz a sequência.
- `pnpm typecheck` passou a cobrir `e2e/`, então quebrar um seletor ou uma assinatura ali falha
  antes de rodar navegador.
- **O que passa a ser obrigatório manter:** todo teste que escreve precisa gerar dados
  distinguíveis por projeto, porque `chromium` e `mobile` compartilham o banco dentro de uma mesma
  execução. E o seed continua sendo a definição do estado inicial: mudar `src/db/seed.ts` muda a
  base de todas as asserções de ponta a ponta.
- Fica a base para o item do [roteiro](../roadmap.md) sobre testar Server Actions isoladamente, que
  dependia justamente de um banco de teste dedicado.
