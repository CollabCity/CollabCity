# Primeiros passos

## Pré-requisitos

| Ferramenta | Versão | Observação |
| --- | --- | --- |
| Node.js | 22 ou superior | O arquivo `.nvmrc` fixa a 24; use `nvm use` |
| pnpm | 10 ou superior | `corepack enable` já disponibiliza a versão do `packageManager` |
| Docker | qualquer versão recente | Só para o banco local; a aplicação roda direto no host |

Não é necessário instalar PostgreSQL nem PostGIS na máquina: o `docker-compose.yml` cuida disso.

## Instalação

```bash
git clone https://github.com/CollabCity/CollabCity.git
cd CollabCity
pnpm install
```

## Variáveis de ambiente

Copie o modelo e ajuste o que for necessário:

```bash
cp .env.example .env.local
```

As variáveis são validadas na inicialização por `src/lib/env.ts`. Se alguma estiver ausente ou
malformada, a aplicação falha imediatamente com uma mensagem apontando o campo — em vez de quebrar
mais tarde, no meio de uma requisição.

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão Postgres. O valor padrão aponta para o container local |
| `BETTER_AUTH_SECRET` | sim | Assina as sessões. Mínimo de 32 caracteres |
| `BETTER_AUTH_URL` | sim | URL base da aplicação, usada nos callbacks |
| `NEXT_PUBLIC_APP_URL` | sim | URL pública, usada em metadados e no sitemap |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | não | Habilita entrada via GitHub quando ambas estão preenchidas |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | não | Idem, para o Google |
| `STORAGE_DRIVER` | não | `local` (padrão) ou `s3` |
| `S3_*` | não | Só quando `STORAGE_DRIVER=s3` |

Gere o segredo de sessão com:

```bash
openssl rand -base64 32
```

## Banco de dados

```bash
pnpm db:up        # sobe o container e espera ficar saudável
pnpm db:migrate   # cria a extensão PostGIS e aplica as migrações
pnpm db:seed      # popula categorias, contas e anúncios
```

O `pnpm db:migrate` executa `src/db/migrate.ts`, que roda `CREATE EXTENSION IF NOT EXISTS postgis`
**antes** das migrações. Isso é indispensável: as tabelas `listings` e `profiles` têm colunas
geradas que chamam `ST_SetSRID` e `ST_MakePoint`, e o `CREATE TABLE` falharia sem a extensão.

Para recomeçar do zero — inclusive apagando o volume:

```bash
pnpm db:reset
```

### Contas de demonstração

O seed cria seis contas, todas com a senha `collabcity-demo-2026`:

| E-mail | Cidade |
| --- | --- |
| `ana@exemplo.test` | Recife, PE |
| `bruno@exemplo.test` | Olinda, PE |
| `carla@exemplo.test` | Jaboatão dos Guararapes, PE |
| `diego@exemplo.test` | São Paulo, SP |
| `elisa@exemplo.test` | Rio de Janeiro, RJ |
| `felipe@exemplo.test` | Belo Horizonte, MG |

A concentração em Pernambuco é proposital: com nove anúncios dentro de um raio de 25 km e outros
nove espalhados pelo país, dá para exercitar o filtro por distância sem inventar dados.

## Rodando

```bash
pnpm dev
```

<http://localhost:3000>

## Verificando antes de abrir um PR

```bash
pnpm check   # lint + tipos + testes, exatamente o que a CI executa
```

Os testes de ponta a ponta ficam de fora do `check` porque exigem banco populado e navegador:

```bash
pnpm exec playwright install chromium   # uma vez
pnpm db:reset
pnpm test:e2e
```

## Problemas comuns

**`Error: connect ECONNREFUSED 127.0.0.1:5432`**
O container não está de pé. Rode `pnpm db:up` e confira com `docker compose ps`.

**`type "geography" does not exist`**
As migrações foram aplicadas sem a extensão. Use `pnpm db:migrate` (que a cria) em vez de chamar
`drizzle-kit migrate` diretamente.

**`no matching manifest for linux/arm64`**
A imagem `postgis/postgis` publica apenas amd64. O `docker-compose.yml` usa
`imresamu/postgis`, que é multi-arquitetura. Se você a alterou, reverta.

**Alterei o schema e nada mudou no banco**
Gere e aplique a migração:

```bash
pnpm db:generate
pnpm db:migrate
```

**A validação de ambiente falha na CI**
Builds sem banco definem `SKIP_ENV_VALIDATION=true`. É o que o workflow em
`.github/workflows/ci.yml` faz.
