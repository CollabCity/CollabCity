# ADR-0012: TypeScript 5.9 em vez do 7

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

No momento da reconstrução, o TypeScript 7 — a reimplementação nativa do compilador, com ganho de
velocidade de ordem de grandeza — já estava publicado como versão estável no npm.

A instrução para o projeto era usar as tecnologias mais atuais. Aqui houve conflito entre "mais
recente" e "mais adequado".

## Decisão

Fixar o TypeScript na linha 5.9.

## Alternativas consideradas

**Adotar o TypeScript 7 agora.** Compilação muito mais rápida e alinhamento com o futuro da
linguagem. Descartado por risco de integração: o plugin de tipos do Next, o `tsserver` das IDEs e
parte do ecossistema de tipos ainda estão se ajustando ao compilador nativo. Em um projeto que
depende de contribuição externa, um ambiente de desenvolvimento instável custa mais do que segundos
de compilação — e o modo de falha seria obscuro para quem está chegando.

**Fixar em uma versão mais antiga.** Perderíamos `verbatimModuleSyntax` e melhorias de inferência
que o código usa.

## Consequências

- A verificação de tipos é mais lenta do que poderia ser. Na escala atual, questão de segundos.
- A migração para o 7 é uma troca de dependência mais um `pnpm typecheck`; nada no código depende
  de particularidades do compilador atual.
- A configuração é estrita e permanece assim: `strict`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`.
- Este ADR deve ser substituído quando o ecossistema estabilizar. É uma decisão datada, e está
  registrada como tal.
