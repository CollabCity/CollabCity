<p align="center">
  <img width="150" src="./Logo/CollabCityLogo.svg" alt="CollabCity">
</p>

<h1 align="center">CollabCity</h1>

<p align="center">
  Conecte quem precisa de ajuda com quem tem habilidades, recursos ou tempo para oferecer.
</p>

<div align="center">

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![PostGIS](https://img.shields.io/badge/PostgreSQL-17%20%2B%20PostGIS-336791.svg)](https://postgis.net)

</div>

---

## O que é

CollabCity é uma plataforma open source de ajuda mútua com recorte territorial. Qualquer pessoa
pode publicar um **pedido** ("preciso de um notebook usado para as aulas de reforço") ou uma
**oferta** ("conserto móveis de madeira em troca de aulas de inglês") e encontrar a contraparte
por perto.

Três eixos organizam tudo o que circula na plataforma:

| Eixo | Valores | O que responde |
| --- | --- | --- |
| Intenção | pedido, oferta | A pessoa precisa ou oferece? |
| Natureza | habilidade, item, voluntariado | O que exatamente circula? |
| Forma de troca | doação, troca, pago | Como a transação acontece? |

A busca cruza esses eixos com **proximidade geográfica real** — não com o nome da cidade digitado
à mão. Cada anúncio carrega um ponto geográfico indexado no PostGIS, e o filtro por raio é
resolvido pelo banco com um índice GiST.

## Stack

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 | Server Components e Server Actions eliminam a camada de API para o próprio front |
| Linguagem | TypeScript 5.9 em modo estrito | `noUncheckedIndexedAccess` e `verbatimModuleSyntax` ligados |
| Banco | PostgreSQL 17 + [PostGIS](https://postgis.net) 3.5 | Busca por raio com índice espacial e busca textual com stemming em português |
| ORM | [Drizzle](https://orm.drizzle.team) | Schema em TypeScript, migrações versionadas, SQL bruto quando o PostGIS exige |
| Autenticação | [Better Auth](https://better-auth.com) | Open source, roda no próprio banco, sem serviço externo |
| Estilo | [Tailwind CSS 4](https://tailwindcss.com) + [Radix UI](https://radix-ui.com) | Tokens em OKLCH derivados da paleta do projeto; primitivas acessíveis |
| Validação | [Zod 4](https://zod.dev) | Um schema serve ao formulário, à Server Action e ao tipo |
| Qualidade | [Biome 2](https://biomejs.dev) | Lint e formatação em uma ferramenta só |
| Testes | [Vitest 4](https://vitest.dev) + [Playwright](https://playwright.dev) | Unidade e ponta a ponta |

Cada escolha está registrada, com alternativas consideradas e consequências, em
[`docs/decisions/`](./docs/decisions/).

## Começando

Pré-requisitos: **Node 22+**, **pnpm 10+** e **Docker** (para o Postgres local).

```bash
git clone https://github.com/CollabCity/CollabCity.git
cd CollabCity
pnpm install

cp .env.example .env.local
# Gere o segredo de sessão e cole em BETTER_AUTH_SECRET:
openssl rand -base64 32

pnpm db:up        # sobe PostgreSQL 17 + PostGIS em container
pnpm db:migrate   # habilita a extensão e aplica as migrações
pnpm db:seed      # popula categorias, contas e anúncios de demonstração

pnpm dev
```

Abra <http://localhost:3000>. O seed cria contas de demonstração — entre com
`ana@exemplo.test` e a senha `collabcity-demo-2026`.

O passo a passo completo, incluindo solução de problemas, está em
[`docs/getting-started.md`](./docs/getting-started.md).

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento com Turbopack |
| `pnpm build` / `pnpm start` | Build de produção e execução |
| `pnpm check` | Lint, verificação de tipos e testes — o mesmo que a CI roda |
| `pnpm lint` / `pnpm lint:fix` | Biome, com e sem correção automática |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `pnpm test:watch` | Testes de unidade e de componente |
| `pnpm test:e2e` | Testes de ponta a ponta com Playwright |
| `pnpm db:up` / `pnpm db:down` | Sobe e derruba o banco local |
| `pnpm db:generate` | Gera uma migração a partir do schema |
| `pnpm db:migrate` / `pnpm db:seed` | Aplica migrações e popula o banco |
| `pnpm db:reset` | Derruba, recria, migra e popula do zero |
| `pnpm db:studio` | Abre o Drizzle Studio |

## Estrutura

```
src/
├── app/                 Rotas do App Router (URLs em português)
│   ├── anuncios/        Busca, detalhe, criação e edição
│   ├── painel/          Área autenticada: anúncios, salvos, perfil
│   ├── mensagens/       Conversas entre membros
│   └── api/auth/        Handler do Better Auth
├── components/          Componentes de domínio
│   └── ui/              Primitivas do design system
├── db/                  Schema Drizzle, cliente, migrações e seed
├── lib/                 Ambiente, autenticação, sessão, geo, validações
├── server/
│   ├── actions/         Server Actions (escrita)
│   └── queries/         Consultas (leitura)
└── test/                Configuração da suíte
```

A leitura e a escrita ficam separadas de propósito: `queries/` só lê e pode ser chamado por
qualquer Server Component; `actions/` sempre valida a entrada e verifica a autorização antes de
gravar. O raciocínio completo está em [`docs/architecture.md`](./docs/architecture.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Primeiros passos](./docs/getting-started.md) | Instalação, variáveis de ambiente, problemas comuns |
| [Arquitetura](./docs/architecture.md) | Camadas, fluxo de uma requisição, fronteiras |
| [Modelo de dados](./docs/data-model.md) | Tabelas, relações, índices e colunas geradas |
| [Busca geoespacial](./docs/busca-geoespacial.md) | Como o PostGIS resolve o filtro por raio |
| [Design system](./docs/design-system.md) | Tokens em OKLCH derivados da paleta do projeto |
| [Testes](./docs/testing.md) | O que é testado em cada nível e por quê |
| [Segurança](./docs/seguranca.md) | Sessões, autorização, limites e superfície exposta |
| [Deploy](./docs/deployment.md) | Publicação em plataformas com free tier |
| [Roteiro](./docs/roadmap.md) | O que ficou fora e o que vem a seguir |
| [Decisões (ADRs)](./docs/decisions/) | Registro das decisões técnicas |

## Contribuindo

Contribuições de qualquer tipo são bem-vindas — código, documentação, design, ideias e relatos de
problema. Comece pelo [guia de contribuição](./CONTRIBUTING.md) e pela
[lista de issues](https://github.com/CollabCity/CollabCity/issues).

## Contribuidores ✨

Obrigado às pessoas que ajudaram a construir este projeto
([legenda dos emojis](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/dcbCIn"><img src="https://avatars.githubusercontent.com/u/48742131?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Daniel Brandão</b></sub></a><br /><a href="https://github.com/CollabCity/CollabCity/commits?author=dcbCIn" title="Documentation">📖</a> <a href="https://github.com/CollabCity/CollabCity/commits?author=dcbCIn" title="Code">💻</a> <a href="#design-dcbCIn" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/Atraisce"><img src="https://avatars.githubusercontent.com/u/76713277?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Atraisce</b></sub></a><br /><a href="#design-Atraisce" title="Design">🎨</a> <a href="https://github.com/CollabCity/CollabCity/commits?author=Atraisce" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/BellatrixLestrangee"><img src="https://avatars.githubusercontent.com/u/37502171?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ujjwal</b></sub></a><br /><a href="#design-BellatrixLestrangee" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/RawatDevanshu"><img src="https://avatars.githubusercontent.com/u/76153868?v=4?s=100" width="100px;" alt=""/><br /><sub><b>RawatDevanshu</b></sub></a><br /><a href="https://github.com/CollabCity/CollabCity/commits?author=RawatDevanshu" title="Documentation">📖</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

Este projeto segue a especificação
[all-contributors](https://github.com/all-contributors/all-contributors). Contribuições de
qualquer tipo são bem-vindas.

## Licença

[MIT](./LICENSE).
