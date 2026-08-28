# Decisões de arquitetura

Cada arquivo registra uma decisão técnica: o contexto em que foi tomada, o que se decidiu, o que
foi descartado e o que se aceitou em troca.

O objetivo não é burocracia. É evitar a pergunta "por que isso está assim?" seis meses depois, e
dar a quem chega base para **discordar com fundamento** — uma decisão registrada pode ser revista;
uma decisão implícita só pode ser adivinhada.

## Formato

```markdown
# ADR-NNNN: Título

- **Situação:** proposta | aceita | substituída por ADR-XXXX
- **Data:** AAAA-MM-DD

## Contexto
O problema, e as restrições que valiam no momento.

## Decisão
O que foi decidido.

## Alternativas consideradas
O que foi descartado, e por quê.

## Consequências
O que melhorou, o que piorou, e o que passou a ser obrigatório manter.
```

## Registro

| ADR | Título | Situação |
| --- | --- | --- |
| [0001](./0001-registrar-decisoes-em-adrs.md) | Registrar decisões em ADRs | aceita |
| [0002](./0002-reconstruir-em-vez-de-migrar.md) | Reconstruir em vez de migrar incrementalmente | aceita |
| [0003](./0003-nextjs-16-app-router.md) | Next.js 16 com App Router | aceita |
| [0004](./0004-postgresql-com-postgis.md) | PostgreSQL com PostGIS | aceita |
| [0005](./0005-drizzle-orm.md) | Drizzle ORM em vez de Prisma | aceita |
| [0006](./0006-tailwind-v4-e-radix-ui.md) | Tailwind CSS 4 e Radix UI | aceita |
| [0007](./0007-server-actions-e-zod.md) | Server Actions com Zod, sem API REST | aceita |
| [0008](./0008-better-auth.md) | Better Auth para autenticação | aceita |
| [0009](./0009-biome-no-lugar-de-eslint-e-prettier.md) | Biome no lugar de ESLint e Prettier | aceita |
| [0010](./0010-hospedagem-em-camada-gratuita.md) | Hospedagem restrita a camadas gratuitas | aceita |
| [0011](./0011-colunas-geradas-para-geografia-e-busca.md) | Colunas geradas para geografia e busca textual | aceita |
| [0012](./0012-typescript-5-em-vez-de-7.md) | TypeScript 5.9 em vez do 7 | aceita |
| [0013](./0013-vitest-e-playwright.md) | Vitest e Playwright | aceita |
| [0014](./0014-portugues-como-idioma-do-produto.md) | Português como idioma do produto | aceita |
