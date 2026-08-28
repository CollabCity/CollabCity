# ADR-0009: Biome no lugar de ESLint e Prettier

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

O projeto usava `eslint-config-next` e nenhum formatador. Era preciso decidir o ferramental de
qualidade da reconstrução.

## Decisão

Biome 2, cobrindo lint e formatação em uma ferramenta e um arquivo de configuração.

## Alternativas consideradas

**ESLint + Prettier.** A combinação mais comum. Custa duas configurações, o pacote de compatibilidade
para evitar que uma brigue com a outra, e uma cadeia de plugins. É notoriamente a parte mais lenta
do ciclo em projetos grandes.

**Só Prettier, sem lint.** Formataria, mas não pegaria import não usado, dependência faltando em
hook nem `any` acidental.

**oxlint.** Mais rápido ainda, porém sem formatador — voltaríamos a duas ferramentas.

## Consequências

- Uma configuração, um comando (`pnpm lint`), execução na casa das dezenas de milissegundos para
  todo o repositório.
- Menos regras específicas de React e Next do que o ecossistema ESLint oferece. As que importam
  (`useExhaustiveDependencies`, `noUnusedImports`) estão cobertas.
- Ativos SVG são excluídos do lint: regras de acessibilidade de JSX não se aplicam a um arquivo de
  imagem, e o alvo correto é o ponto de uso (`<Image alt=...>`).
- Foi preciso ligar `css.parser.tailwindDirectives` para o Biome entender `@theme` e `@utility`.
- A supressão de `noImportantStyles` no bloco `prefers-reduced-motion` é explícita e justificada no
  comentário: ali o `!important` é necessário para a preferência do sistema vencer a cascata.
