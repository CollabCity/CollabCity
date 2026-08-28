# Testes

## Níveis

| Nível | Ferramenta | Cobre | Onde |
| --- | --- | --- | --- |
| Unidade | Vitest | Funções puras: geografia, formatação, validação, limites | `src/**/*.test.ts` |
| Componente | Vitest + Testing Library | Renderização e acessibilidade de componentes isolados | `src/**/*.test.tsx` |
| Ponta a ponta | Playwright | Fluxos reais com servidor, banco e navegador | `e2e/*.spec.ts` |

```bash
pnpm test         # unidade e componente
pnpm test:watch   # em observação
pnpm test:e2e     # ponta a ponta
pnpm check        # lint + tipos + unidade — o que a CI roda
```

## O que é testado, e por quê

O critério não é cobertura de linhas. É **onde um erro passaria despercebido**.

### Geografia (`src/lib/geo.test.ts`)

Cálculo geográfico erra em silêncio: um raio mal convertido devolve resultados plausíveis e
errados. Os testes fixam distâncias reais conhecidas (Recife–Olinda, cerca de 5 km;
Recife–São Paulo, cerca de 2.130 km) e cobrem os extremos:

- pontos antípodas, onde o erro de ponto flutuante levaria `Math.asin` a `NaN` sem o
  `Math.min(1, ...)`;
- o polo, onde a conversão de longitude divergiria sem o limite em `boundingBox`;
- entrada não numérica em `clampRadius`, que precisa cair no padrão em vez de propagar `NaN`.

### Validação (`src/lib/validations/listing.test.ts`)

As duas regras cruzadas de `listingInputSchema` têm teste próprio, incluindo a menos óbvia:
**anúncio gratuito não pode ter preço**. Sem ela, um valor invisível na interface ficaria gravado
no banco.

`parseSearchParams` é testado com entrada deliberadamente inválida, porque a query string é
controlada por quem acessa. O contrato é: nunca lançar, sempre cair no padrão.

### Taxonomia (`src/lib/taxonomy.test.ts`)

Um teste compara as listas de enums com os mapas de rótulos. Se alguém adicionar um valor ao banco
sem o rótulo correspondente, a interface mostraria `undefined` — e nenhum outro teste pegaria isso.

### Limitador de taxa (`src/server/rate-limit.test.ts`)

Usa temporizadores falsos para verificar que a janela realmente expira e que chaves diferentes não
interferem entre si.

### Componente (`src/components/listing-card.test.tsx`)

As asserções são feitas por papel acessível (`getByRole("link", { name })`), não por classe CSS.
Um teste que quebra ao renomear uma classe é ruído; um que quebra quando o link perde o nome
acessível apontou um problema real.

### Ponta a ponta (`e2e/`)

Cobre o que só falha com tudo integrado:

- busca textual com stemming em português, indo até o banco;
- filtro por intenção, verificando que a lista de resultados muda;
- rotas protegidas redirecionando para `/entrar`;
- entrada, cadastro com senha curta e mensagem genérica de credencial inválida;
- publicação de anúncio de ponta a ponta;
- identificador inexistente respondendo **404 de verdade**, não 200 com tela de erro.

Esta última asserção não é preciosismo. Ela já pegou um defeito real: `initials()` exportada de um
módulo `"use client"` e chamada no servidor derrubava a renderização, e a rota respondia 200 com o
boundary de erro — um soft 404 que buscadores indexariam como conteúdo.

## Rodando os testes de ponta a ponta

Eles precisam de banco populado e navegador:

```bash
pnpm exec playwright install chromium   # uma vez
pnpm db:reset
pnpm test:e2e
```

Por padrão o Playwright sobe o próprio servidor (`pnpm build && pnpm start`). Para rodar contra um
servidor já em execução — bem mais rápido no ciclo de desenvolvimento:

```bash
E2E_BASE_URL=http://localhost:3000 pnpm exec playwright test
```

### Uma armadilha do paralelismo

Os testes de autenticação fazem login de verdade, e o Better Auth limita tentativas **por IP**.
Como todos os navegadores saem de `127.0.0.1`, uma suíte muito paralela esbarra no limite e falha
com sintoma enganoso: a pessoa continua em `/entrar`, sem mensagem de erro.

O limite está declarado explicitamente em `src/lib/auth.ts` (10 tentativas por minuto), com folga
para a suíte e ainda protetor em produção. Se você adicionar testes que fazem login, tenha isso em
mente antes de culpar o código de sessão.

## Escrevendo um teste novo

Vale a pena testar quando a resposta a alguma destas for sim:

- Um erro aqui passaria despercebido em revisão?
- Há um caso de borda numérico, de fuso ou de codificação?
- Existe uma regra de negócio que dois lugares precisam respeitar?
- É uma regressão que já aconteceu?

Não vale testar que um componente renderiza o texto que acabou de receber por propriedade.

## O que ainda não é testado

- Server Actions em isolamento — hoje só são exercitadas de ponta a ponta. Exigiria um banco de
  teste dedicado e transações revertidas por caso.
- Consultas com carga realista. Os planos de execução foram conferidos à mão com `EXPLAIN`; não há
  teste automatizado que trave a regressão de um índice.

Ambos estão no [roteiro](./roadmap.md).
