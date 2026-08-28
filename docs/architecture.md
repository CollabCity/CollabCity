# Arquitetura

## Visão geral

CollabCity é uma aplicação Next.js de processo único. Não há back-end separado: o servidor que
renderiza as páginas é o mesmo que lê e grava no banco. A única dependência externa obrigatória é
o PostgreSQL com PostGIS.

```
Navegador
   │
   │  HTML transmitido em fluxo + Server Actions
   ▼
Next.js 16 (App Router, React Server Components)
   │
   ├── src/server/queries/   leitura  ──┐
   ├── src/server/actions/   escrita  ──┤
   ├── src/lib/auth.ts       sessão   ──┤
   │                                    ▼
   │                              Drizzle ORM
   │                                    │
   ▼                                    ▼
Assets estáticos            PostgreSQL 17 + PostGIS 3.5
```

## Por que não há uma API REST

A camada de API tradicional existiria para servir um cliente que não compartilha processo com o
servidor. Com Server Components, o componente que precisa de dados executa no servidor e chama a
função de consulta diretamente. Uma rota HTTP intermediária acrescentaria serialização,
revalidação de tipos e uma superfície pública a proteger — sem nenhum consumidor para justificá-la.

A única rota HTTP da aplicação é `/api/auth/[...all]`, exigida pelo Better Auth para os fluxos de
sessão e OAuth. Quando existir um cliente móvel ou integração de terceiros, uma API pública será
adicionada de forma deliberada, não por hábito. Ver [ADR-0007](./decisions/0007-server-actions-e-zod.md).

## Camadas

### `src/lib/` — fundações

Sem dependência de React nem de requisição. São funções puras e configuração:

- `env.ts` valida as variáveis de ambiente na importação. Uma variável ausente derruba a
  aplicação na inicialização, não no meio de uma requisição.
- `geo.ts` reúne cálculos geográficos que o cliente precisa fazer sem ida ao servidor
  (distância aproximada, caixa envolvente, limites de raio).
- `validations/` guarda os schemas Zod. Cada schema é a fonte única de verdade: valida a entrada
  da Server Action **e** define o tipo do dado.
- `auth.ts` e `session.ts` configuram o Better Auth e expõem as guardas de sessão.

### `src/server/queries/` — leitura

Funções assíncronas que consultam o banco e devolvem dados prontos para renderizar. Nenhuma delas
verifica autorização: são chamadas a partir de Server Components que já decidiram o que pode ser
exibido. As que dependem do usuário recebem o `userId` como parâmetro explícito, nunca lendo a
sessão por conta própria — o que torna a dependência visível na assinatura.

Uma exceção deliberada: `getConversation` recebe o `userId` e devolve `null` quando a pessoa não
participa da conversa. A verificação vai junto da consulta porque, separada, exigiria uma segunda
ida ao banco e abriria espaço para esquecer a checagem.

### `src/server/actions/` — escrita

Toda Server Action segue a mesma sequência:

1. `requireSession()` — sem sessão, redireciona para `/entrar`.
2. `rateLimit(...)` — quando a ação é passível de abuso.
3. `schema.safeParse(...)` — a entrada vem do navegador e nunca é confiável.
4. A escrita, com a condição de autoria **dentro** do `WHERE`.
5. `revalidatePath(...)` nas rotas afetadas.

O passo 4 merece destaque. Em vez de consultar o dono e depois gravar:

```ts
// Não: há uma janela entre a leitura e a escrita, e é fácil esquecer a checagem.
const listing = await db.select().from(listings).where(eq(listings.id, id));
if (listing.authorId !== session.user.id) throw new Error("proibido");
await db.update(listings).set(values).where(eq(listings.id, id));
```

a condição vai junto:

```ts
// Sim: sem linha correspondente, nada é alterado. Uma consulta, sem corrida.
const updated = await db
  .update(listings)
  .set(values)
  .where(and(eq(listings.id, id), eq(listings.authorId, session.user.id)))
  .returning({ id: listings.id });

if (updated.length === 0) return errorState("Anúncio não encontrado.");
```

### `src/components/` — apresentação

Server Components por padrão. `"use client"` aparece só onde há estado, evento ou API do
navegador: filtros de busca, formulários, alternador de tema, composição de mensagem.

`components/ui/` contém as primitivas do design system, construídas sobre Radix UI. Elas não
conhecem o domínio: recebem classes e propriedades, e nada mais.

## Fluxo de uma busca por proximidade

1. A pessoa clica em "Usar minha localização" em `SearchFilters` (componente cliente).
2. `navigator.geolocation` devolve as coordenadas, que entram na query string
   (`?latitude=...&longitude=...&radius=25000&sort=distance`).
3. `router.push` navega; o Next re-renderiza `app/anuncios/page.tsx` no servidor.
4. `parseSearchParams` valida a query string com Zod. Valor inválido cai no padrão — a página de
   busca nunca quebra por causa de uma URL adulterada.
5. `searchListings` monta a consulta com `ST_DWithin` e projeta `ST_Distance` para exibição.
6. O resultado volta como HTML transmitido em fluxo, dentro de um `Suspense` cuja `key` é
   derivada dos filtros — o esqueleto reaparece a cada mudança.

O detalhe de por que `ST_DWithin` e não uma comparação com `ST_Distance` está em
[busca-geoespacial.md](./busca-geoespacial.md).

## Estado

Não há biblioteca de estado global. As três formas de estado da aplicação são:

| Estado | Onde vive | Exemplo |
| --- | --- | --- |
| Do servidor | No banco, lido a cada render | Anúncios, conversas, perfil |
| Da navegação | Na query string | Filtros e paginação da busca |
| Da interação | Em `useState` local | Campo em edição, seleção do formulário |

Manter os filtros na URL faz com que uma busca seja compartilhável, voltável pelo histórico e
renderizável no servidor — três propriedades que um estado em memória não teria.

## Cache e revalidação

A página inicial declara `revalidate = 60`: contadores e anúncios recentes toleram um minuto de
defasagem em troca de não consultar o banco a cada visita. As demais rotas são dinâmicas, porque
dependem de sessão ou de filtros.

Depois de cada escrita, a Server Action chama `revalidatePath` nas rotas afetadas. É invalidação
explícita, não expiração por tempo: quem publica um anúncio o vê na listagem imediatamente.

## Limites conhecidos

- **Rate limiting em memória.** `src/server/rate-limit.ts` guarda os contadores no processo. Com
  várias réplicas, o limite efetivo é multiplicado pelo número de instâncias. Serve para conter
  abuso trivial, não ataque coordenado.
- **Mensagens sem tempo real.** A conversa atualiza a cada navegação. Não há WebSocket nem
  polling.
- **Sem verificação de e-mail.** Depende de um provedor de envio, ainda não integrado.

Todos estão registrados em [roadmap.md](./roadmap.md).
