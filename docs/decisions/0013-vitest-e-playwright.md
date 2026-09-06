# ADR-0013: Vitest e Playwright

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

O projeto não tinha nenhum teste. Era preciso escolher as ferramentas e, mais importante, o
critério do que testar — sem isso, um projeto comunitário acumula testes que apenas repetem a
implementação.

## Decisão

Vitest para unidade e componente, Playwright para ponta a ponta. O critério é **onde um erro
passaria despercebido**, não cobertura de linhas.

## Alternativas consideradas

**Jest.** O padrão histórico. Exigiria configuração adicional para ESM e TypeScript, que o Vitest
resolve nativamente por reaproveitar a pipeline do Vite.

**Cypress.** Boa experiência de depuração, mas o Playwright roda em vários navegadores no mesmo
processo, tem espera automática mais confiável e o modo `--reporter=github` integra com a CI sem
configuração.

**Apenas testes de ponta a ponta.** Cobririam os fluxos, mas seriam péssimos para casos de borda
numéricos: verificar o comportamento de `haversineDistance` em pontos antípodas por navegador é
absurdo.

## Consequências

- As funções puras — geografia, formatação, validação, limitação de taxa — concentram os testes,
  porque é onde um erro é silencioso e plausível.
- Os testes de componente usam papéis acessíveis (`getByRole`), não classes CSS: quebram quando o
  nome acessível some, e não quando alguém renomeia um estilo.
- Os testes de ponta a ponta ficam fora do `pnpm check`. O banco que eles usam passou a ser
  dedicado e preparado pela própria suíte — ver [ADR-0015](./0015-banco-dedicado-para-testes-de-ponta-a-ponta.md).
- Uma armadilha descoberta na prática: os testes de autenticação fazem login de verdade, e o limite
  do Better Auth é por IP. Uma suíte muito paralela esbarra no limite e falha com sintoma enganoso.
  O limite está explícito em `src/lib/auth.ts`.
- Server Actions ainda não têm teste isolado — exigiria banco de teste com transações revertidas.
  Está no [roteiro](../roadmap.md).
