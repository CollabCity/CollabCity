# Deploy

A restrição que guiou as escolhas: **o projeto precisa rodar inteiro dentro de camadas gratuitas**,
sem cartão de crédito. É um projeto comunitário, e um custo fixo mensal seria a primeira coisa a
matá-lo.

## Componentes

| Componente | Serviço sugerido | Camada gratuita | Alternativas |
| --- | --- | --- | --- |
| Aplicação | Vercel | 100 GB de banda, builds ilimitados em projetos pessoais | Netlify, Railway, Fly.io, contêiner próprio |
| Banco | Neon | 0,5 GB, PostGIS disponível, ramificação de banco | Supabase (500 MB), Aiven, Postgres próprio |
| Imagens | Cloudflare R2 | 10 GB e sem taxa de saída | Supabase Storage, UploadThing, disco local |

Nada no código amarra a plataforma: a aplicação precisa apenas de um runtime Node e de uma
`DATABASE_URL` para um Postgres com PostGIS. Ver
[ADR-0010](./decisions/0010-hospedagem-em-camada-gratuita.md).

## Banco de dados

Qualquer Postgres 15+ com PostGIS serve. No Neon:

1. Crie o projeto e copie a string de conexão (a variante *pooled*).
2. Habilite a extensão — uma vez, no console SQL ou via `psql`:

   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

   O `pnpm db:migrate` também tenta criá-la, mas alguns provedores exigem que a conta com
   privilégio faça isso antes.
3. Aplique as migrações a partir da sua máquina:

   ```bash
   DATABASE_URL="postgresql://..." pnpm exec tsx src/db/migrate.ts
   ```

**Não rode o seed em produção.** Ele executa `TRUNCATE` nas tabelas de domínio.

### Uma vantagem concreta da ramificação de banco

O Neon cria ramos de banco por cópia sob demanda. Combinado com deploys de pré-visualização, cada
pull request pode receber um banco próprio, com dados de produção, sem risco de escrita cruzada.
Foi um dos motivos da escolha.

## Aplicação

Na Vercel, importe o repositório. O framework é detectado sozinho. Configure as variáveis:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | String de conexão do provedor |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL pública, com `https://` |
| `NEXT_PUBLIC_APP_URL` | A mesma URL |

`BETTER_AUTH_URL` **precisa** começar com `https://` em produção: é esse esquema que faz os
cookies de sessão serem emitidos como `Secure`.

### OAuth (opcional)

Preencha `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` ou os equivalentes do Google. Ausentes, a
aplicação usa apenas e-mail e senha — a configuração é condicional em `src/lib/env.ts`.

URL de callback: `https://SEU_DOMINIO/api/auth/callback/github`.

## Contêiner

Para plataformas que aceitam imagem própria, ative a saída autônoma em `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

```dockerfile
FROM node:24-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV SKIP_ENV_VALIDATION=true
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

`SKIP_ENV_VALIDATION=true` no estágio de build é intencional: a compilação não acessa o banco, e
exigir segredos ali obrigaria a injetá-los na imagem.

## Migrações no deploy

As migrações **não** rodam automaticamente. É deliberado: uma migração aplicada por um build
paralelo, em duas réplicas ao mesmo tempo, é uma forma conhecida de corromper o esquema.

O fluxo recomendado é aplicar a migração antes de promover a nova versão:

```bash
DATABASE_URL="postgresql://..." pnpm exec tsx src/db/migrate.ts
```

Isso também obriga migrações a serem compatíveis com a versão anterior do código — o que é a
prática certa de qualquer forma.

## Verificando o deploy

```bash
curl -I https://SEU_DOMINIO/                       # 200
curl -I https://SEU_DOMINIO/anuncios               # 200
curl -I https://SEU_DOMINIO/rota-inexistente       # 404
curl -s  https://SEU_DOMINIO/robots.txt
curl -s  https://SEU_DOMINIO/sitemap.xml | head
```

E, contra o ambiente publicado:

```bash
E2E_BASE_URL=https://SEU_DOMINIO pnpm exec playwright test e2e/navegacao.spec.ts
```

Os testes de autenticação ficam de fora: eles dependem das contas do seed.
