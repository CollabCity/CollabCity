# ADR-0007: Server Actions com Zod, sem API REST

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

Com App Router ([ADR-0003](./0003-nextjs-16-app-router.md)), havia duas formas de tratar escrita:
rotas de API chamadas por `fetch` a partir do cliente, ou Server Actions invocadas diretamente dos
formulários.

O único consumidor da aplicação é a própria aplicação. Não há cliente móvel nem integração de
terceiros.

## Decisão

Escrita por Server Actions, leitura por funções chamadas diretamente dos Server Components. Toda
entrada validada com Zod. A única rota HTTP é `/api/auth/[...all]`, exigida pelo Better Auth.

Um mesmo schema Zod serve a três propósitos: valida no cliente, valida no servidor e define o tipo
do dado.

## Alternativas consideradas

**API REST interna.** Acrescentaria serialização, uma segunda definição de tipos e uma superfície
pública a proteger — sem consumidor que a justificasse. Quando existir um cliente móvel, uma API
pública será adicionada deliberadamente.

**tRPC.** Resolve bem a tipagem ponta a ponta, mas é a solução para o problema que Server Actions
já eliminam neste contexto: a fronteira de rede entre cliente e servidor.

**Validação só no cliente.** Server Actions são endpoints HTTP e podem ser invocadas diretamente. A
validação do navegador é conveniência; o controle está no servidor.

## Consequências

- Formulários funcionam com `useActionState`, e o estado de erro chega em um formato único
  (`ActionState`), com mensagens por campo.
- A entrada vem sempre como `FormData` — tudo é texto. Os schemas usam `z.coerce` onde o tipo final
  é numérico.
- Cada ação precisa declarar o que invalidar com `revalidatePath`. Esquecer significa dado velho na
  tela.
- Toda ação segue a mesma sequência: sessão, limite de taxa, validação, escrita com a condição de
  autoria no `WHERE`, revalidação. O padrão é repetitivo de propósito: é fácil auditar.
