# Deploy

A restrição que guiou as escolhas: **o projeto precisa rodar inteiro dentro de camadas gratuitas**,
sem cartão de crédito. É um projeto comunitário, e um custo fixo mensal seria a primeira coisa a
matá-lo.

## Componentes

| Componente | Serviço sugerido | Camada gratuita | Alternativas |
| --- | --- | --- | --- |
| Aplicação | Vercel | 100 GB de banda; o gratuito é **só para uso não comercial** | Netlify, Railway, Fly.io, contêiner próprio |
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

## Medição (opcional)

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_GA_ID` | Identificador do Google Analytics, no formato `G-...` |

Ausente, nenhum script de terceiro carrega e o banner de consentimento nem aparece — é o padrão em
desenvolvimento. Nada carrega antes do aceite de quem visita; ver
[ADR-0022](./decisions/0022-medicao-e-publicidade-com-consentimento.md).

**Não há publicidade na plataforma**, e isso é decisão, não pendência: ver
[ADR-0025](./decisions/0025-doacao-em-vez-de-publicidade.md). Como efeito colateral, a instalação
inteira continua cabendo no plano gratuito da Vercel, cujas
[diretrizes de uso justo](https://vercel.com/docs/limits/fair-use-guidelines) reservam o Hobby ao
uso não comercial e citam a exibição de anúncios como uso comercial. Se alguém reintroduzir
anúncio, precisa reabrir a hospedagem junto.

## Apoio ao projeto (opcional)

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_DONATION_URL` | Página do canal de apoio — Ko-fi, GitHub Sponsors, Open Collective, Apoia.se |
| `NEXT_PUBLIC_DONATION_PIX` | Chave Pix, exibida para cópia |

Sem nenhuma das duas, a página `/apoie` responde 404 e o rodapé não a oferece: um convite a apoiar
que leva a lugar nenhum é pior que nenhum convite. Basta uma delas para a página existir.

Quem recebe é **quem opera a instância**, não o repositório — o mesmo raciocínio do controlador de
dados. O pagamento acontece fora da aplicação, que não processa valores nem guarda dado bancário;
as mesmas diretrizes da Vercel dizem expressamente que **doação não é uso comercial**.

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

## Expurgo agendado — obrigatório

A exclusão de conta é **agendada**: o pedido marca uma data e o apagamento só acontece quando
alguém chama `/api/manutencao/expurgo`. **Sem um agendador configurado, nenhuma exclusão é
executada** — a linha fica pendente para sempre e a pessoa acredita que foi excluída. É a falha mais
silenciosa deste sistema, e por isso este passo não é opcional.

### Na Vercel, que é o caminho principal

O `vercel.json` já declara o agendamento:

```json
{ "crons": [{ "path": "/api/manutencao/expurgo", "schedule": "0 4 * * *" }] }
```

Falta apenas definir a variável de ambiente **`CRON_SECRET`** no projeto, com um valor longo e
aleatório. A Vercel o injeta como `Authorization: Bearer` nas chamadas agendadas, e a rota aceita
esse nome além de `MAINTENANCE_SECRET` — assim não é preciso configurar a mesma senha duas vezes.

No plano gratuito o cron roda **uma vez por dia**, com horário garantido apenas dentro da hora, e
só em UTC. É suficiente: o que se agenda é um prazo de trinta dias.

### Fora da Vercel

`.github/workflows/manutencao.yml` faz o mesmo por `curl`, uma vez por dia. Configure em
**Settings › Secrets and variables › Actions** do repositório:

| Segredo | Valor |
| --- | --- |
| `APP_URL` | endereço público da aplicação |
| `MAINTENANCE_SECRET` | o mesmo valor definido no ambiente da aplicação |

**Cuidado com uma armadilha do GitHub:** em repositórios públicos, workflows agendados são
desativados após **60 dias sem commits** — e só commit reinicia o contador, não issue nem pull
request. Num projeto que fique quieto dois meses, as exclusões param sem aviso na aplicação. É o
principal motivo de o cron da Vercel ser preferido.

Qualquer outro agendador serve, desde que faça a chamada com o cabeçalho:

```bash
curl -X POST https://SEU_DOMINIO/api/manutencao/expurgo \
  -H "Authorization: Bearer $MAINTENANCE_SECRET"
```

A rota aceita `GET` e `POST` porque os agendadores diferem: a Vercel invoca com `GET`.

Para rodar à mão, com acesso ao banco: `pnpm db:purge`.

## Verificando o deploy

```bash
curl -I https://SEU_DOMINIO/                       # 200
curl -I https://SEU_DOMINIO/anuncios               # 200
curl -I https://SEU_DOMINIO/api/manutencao/expurgo # 404 sem o cabeçalho — a rota
                                                   # não se anuncia a quem não tem o segredo
curl -I https://SEU_DOMINIO/rota-inexistente       # 404
curl -s  https://SEU_DOMINIO/robots.txt
curl -s  https://SEU_DOMINIO/sitemap.xml | head
```

E, contra o ambiente publicado:

```bash
E2E_BASE_URL=https://SEU_DOMINIO pnpm exec playwright test e2e/navegacao.spec.ts
```

Os testes de autenticação ficam de fora: eles dependem das contas do seed.
