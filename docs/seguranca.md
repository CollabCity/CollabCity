# Segurança

Este documento trata da segurança **técnica** da aplicação: sessões, autorização, limites e
superfície exposta. A orientação de segurança dirigida a quem usa a plataforma — o que ela não faz
e como se proteger ao combinar uma troca — está na página `/seguranca` do produto e na
[ADR-0017](./decisions/0017-aviso-de-responsabilidade-e-seguranca.md). O canal de denúncia e a fila
de moderação estão na [ADR-0018](./decisions/0018-canal-de-denuncia-e-moderacao.md).

## Sessões

A autenticação é do [Better Auth](https://better-auth.com), com as tabelas no próprio banco. Não
há serviço externo guardando credenciais.

- Senha com no mínimo 12 caracteres, com hash pelo algoritmo padrão da biblioteca.
- Sessão válida por 30 dias, renovada a cada 24 horas de uso.
- Cache de sessão em cookie por 5 minutos, para evitar uma consulta ao banco a cada navegação.

Os cookies são marcados `Secure` quando `BETTER_AUTH_URL` usa `https`. O critério é o esquema da
URL, e **não** `NODE_ENV`: um build de produção servido em `http` — teste local, container atrás de
um proxy que termina o TLS — emitiria cookies que o navegador descarta, e o login falharia sem
qualquer mensagem.

## Limitação de taxa

Há duas camadas, e elas resolvem problemas diferentes.

**Do Better Auth**, por IP, sobre as rotas de autenticação. Declarada explicitamente em
`src/lib/auth.ts`:

| Rota | Limite |
| --- | --- |
| `/sign-in/email` | 10 por minuto |
| `/sign-up/email` | 10 por hora |
| Demais | 100 por minuto |

O padrão da biblioteca é mais rígido (3 tentativas por minuto no login). Foi afrouxado de
propósito: com CGNAT, comum entre operadoras brasileiras, um bairro inteiro pode compartilhar um
endereço IP — e vizinhos bloqueariam uns aos outros.

**Da aplicação**, por usuário, sobre ações de escrita (`src/server/rate-limit.ts`):

| Ação | Limite |
| --- | --- |
| Publicar anúncio | 10 por hora |
| Iniciar conversa | 20 por hora |
| Enviar mensagem | 60 a cada 10 minutos |
| Enviar avaliação | 10 por hora |
| Enviar denúncia | 5 por hora |
| Enviar imagem | 40 por hora |

Esta segunda camada guarda os contadores **em memória do processo**. Com várias réplicas, o limite
efetivo é multiplicado pelo número de instâncias. Serve para conter abuso trivial, não ataque
coordenado. Substituí-la por um armazenamento compartilhado está no [roteiro](./roadmap.md).

## Autorização

A regra é sempre a mesma: a condição de autoria vai **dentro** da instrução de escrita.

```ts
const updated = await db
  .update(listings)
  .set(values)
  .where(and(eq(listings.id, listingId), eq(listings.authorId, session.user.id)))
  .returning({ id: listings.id });

if (updated.length === 0) return errorState("Anúncio não encontrado.");
```

Ler o dono e depois gravar abriria uma janela entre as duas operações e dependeria de ninguém
esquecer a checagem. Aqui, sem linha correspondente, nada acontece.

## Papéis e suspensão

A equipe vive em `moderators`, com dois papéis: `moderator` resolve denúncias, `admin` faz isso e
também suspende contas. São papéis encaixados — todo admin é moderador.

A suspensão passa a valer em `requireSession`, por onde toda página autenticada e toda Server Action
passam antes de qualquer escrita. É um ponto só, em vez de uma checagem por ação. Anúncios de contas
suspensas também saem da busca e do perfil. Ver a
[ADR-0020](./decisions/0020-suspensao-de-contas.md).

## Arquivos enviados

Imagens são validadas pelos **bytes**, nunca pelo `Content-Type` declarado pelo navegador, e SVG é
recusado por ser XML capaz de carregar `<script>` — servido da mesma origem, viraria XSS. Detalhes
na [ADR-0019](./decisions/0019-imagens-nos-anuncios.md).

## Não revelar o que existe

Três lugares respondem de forma deliberadamente ambígua:

| Situação | Resposta | Por quê |
| --- | --- | --- |
| Recurso de outra pessoa | 404, não 403 | Um 403 confirmaria que o identificador existe |
| Credencial inválida | "E-mail ou senha inválidos." | Distinguir os casos revelaria quem tem conta |
| Conversa alheia | "Conversa não encontrada." | Mesma resposta de conversa inexistente |

## Validação

Toda entrada é validada com Zod na fronteira do servidor, mesmo quando o formulário já validou no
navegador — a validação do cliente é conveniência, não controle. Server Actions são endpoints HTTP
e podem ser chamadas diretamente.

A query string da busca também passa por Zod. Valor inválido cai no padrão em vez de derrubar a
página: o parâmetro é controlado por quem acessa.

## Cabeçalhos

Definidos em `next.config.ts` para todas as rotas:

| Cabeçalho | Valor |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` |

`geolocation=(self)` é necessário: a busca por proximidade usa `navigator.geolocation`. Câmera e
microfone são negados por completo, já que a aplicação não os utiliza.

Não há Content-Security-Policy ainda — ela exige tratar os scripts inline do Next com nonce. Está
no [roteiro](./roadmap.md).

## Injeção de SQL

As consultas usam Drizzle. Os fragmentos `sql` com interpolação — inclusive nas expressões PostGIS
— geram **parâmetros vinculados**, não concatenação de texto:

```ts
sql`ST_DWithin(${listings.location}, ${origin}, ${params.radius})`
```

O valor de `params.radius` viaja como parâmetro. Nenhum ponto do código monta SQL por concatenação
de string.

## Dados de localização

O ponto exato de um anúncio nunca é exibido: a interface mostra apenas cidade e estado. As
coordenadas ficam no servidor, servindo ao cálculo de distância.

Isso mitiga, mas não elimina o risco. Distância é informação: alguém com várias contas poderia
triangular a posição a partir de origens diferentes. Arredondar a distância exibida ou deslocar o
ponto por um raio aleatório está no [roteiro](./roadmap.md).

## Segredos

`src/lib/env.ts` valida as variáveis na inicialização. `BETTER_AUTH_SECRET` exige no mínimo 32
caracteres — uma chave curta é rejeitada antes de a aplicação subir, e não silenciosamente aceita.

Nenhum segredo é versionado. O `.env.example` traz apenas marcadores.

## Relatando um problema

Ver [SECURITY.md](../SECURITY.md).
