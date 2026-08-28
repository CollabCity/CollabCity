# ADR-0003: Next.js 16 com App Router

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

O projeto vinha do Next.js 11 com Pages Router. Era preciso escolher a base para a reconstrução,
sabendo que a aplicação é majoritariamente de leitura (busca e navegação de anúncios), com
interatividade concentrada em poucos pontos: filtros, formulários e mensagens.

## Decisão

Next.js 16 com App Router, React Server Components por padrão e `"use client"` apenas onde há
estado, evento ou API de navegador.

## Alternativas consideradas

**Manter o Pages Router.** Continuaria funcionando, mas cada página de dados exigiria
`getServerSideProps`, serialização do resultado e envio do JSON ao cliente além do HTML. Server
Components eliminam a segunda cópia.

**Remix / React Router 7.** Modelo de dados excelente e mais simples de raciocinar que o do App
Router. Perdeu por ecossistema: Server Components e a integração com hospedagem em camada gratuita
estão mais maduros no Next.

**SvelteKit ou Astro.** Ambos entregariam menos JavaScript. Descartados por serem projeto
comunitário: React é a base com maior chance de alguém já conhecer, e contribuição é o recurso
escasso aqui.

**SPA com API separada.** Duas bases de código e uma fronteira HTTP para manter, sem consumidor que
a justificasse. Ver [ADR-0007](./0007-server-actions-e-zod.md).

## Consequências

- A maior parte da árvore renderiza no servidor; o JavaScript enviado fica restrito aos componentes
  interativos.
- A fronteira servidor/cliente passa a ser uma preocupação real. Um erro típico já ocorreu neste
  projeto: uma função exportada de um módulo `"use client"` e chamada durante a renderização no
  servidor derruba a árvore inteira — e o sintoma só aparece no build de produção.
- `typedRoutes` está ligado: links para rotas inexistentes falham na verificação de tipos.
- Cada escrita precisa declarar explicitamente o que invalidar, via `revalidatePath`.
