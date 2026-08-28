# ADR-0002: Reconstruir em vez de migrar incrementalmente

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

O repositório continha Next.js 11, React 17, TypeScript 4.4 e o Pages Router — todos vários anos
atrás do estado atual. O código de aplicação era, na íntegra:

- `pages/index.tsx`, ainda com o conteúdo padrão do `create-next-app` (links para a documentação da
  Vercel);
- `pages/_app.tsx`, o boilerplate;
- `pages/api/hello.ts`, o exemplo que devolve `{ name: "John Doe" }`;
- dois arquivos CSS gerados pelo template.

Não havia banco de dados, autenticação, modelo de domínio nem teste. O único conteúdo autoral era o
README, o logotipo e as propostas de paleta.

## Decisão

Reescrever a aplicação do zero sobre a stack atual, preservando o que era autoral: a visão de
produto do README, o logotipo e as paletas de cor.

## Alternativas consideradas

**Migração incremental (Pages Router → App Router).** É o caminho certo quando há aplicação em
produção e usuários. Aqui não havia o que preservar: a migração seria de três arquivos de
boilerplate, e o custo de manter os dois roteadores convivendo durante a transição superaria em
muito o de começar limpo.

**Atualizar as dependências e seguir.** Resolveria o número da versão sem resolver nada mais. O
projeto continuaria sem domínio, sem banco e sem testes — que era o problema real.

## Consequências

- O histórico do Git é preservado; a reconstrução vem em um ramo próprio, não em um repositório
  novo.
- Nenhum código anterior sobrevive, então nenhum comportamento anterior pode ser assumido.
- A visão de produto foi tratada como requisito, não como sugestão: os três eixos do domínio
  (intenção, natureza, forma de troca) e a busca por raio saem diretamente do README original.
