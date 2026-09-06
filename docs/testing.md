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
- perfil público exibindo sinais de confiança **sem** vazar e-mail nem coordenadas;
- avaliação recíproca, incluindo a asserção de que ela **não** aparece antes de a outra parte
  avaliar — o prazo às cegas da [ADR-0016](./decisions/0016-avaliacoes-presas-a-conversas.md);
- o ciclo da denúncia: publicar, denunciar, acolher na moderação e conferir que o anúncio saiu da
  busca; mais o 404 da fila para quem não modera;
- identificador inexistente respondendo **404 de verdade**, não 200 com tela de erro.

Esta última asserção não é preciosismo. Ela já pegou um defeito real: `initials()` exportada de um
módulo `"use client"` e chamada no servidor derrubava a renderização, e a rota respondia 200 com o
boundary de erro — um soft 404 que buscadores indexariam como conteúdo.

## Rodando os testes de ponta a ponta

```bash
pnpm exec playwright install chromium   # uma vez
pnpm db:up                              # o Postgres precisa estar de pé
pnpm test:e2e
```

Não é preciso preparar banco nenhum. A suíte cuida disso — e cuida num banco que não é o seu.

### O banco é outro, de propósito

A suíte **escreve**: um dos testes publica um anúncio pela interface. Enquanto ela apontou para o
banco de desenvolvimento, cada execução deixava linhas para trás, e os contadores da home iam se
afastando do que o seed descreve. O raciocínio completo está na
[ADR-0015](./decisions/0015-banco-dedicado-para-testes-de-ponta-a-ponta.md).

Hoje o alvo é `collabcity_e2e`, derivado do seu `DATABASE_URL` com o sufixo `_e2e`. Ele é criado na
primeira execução, e migrado e repopulado a cada uma. O servidor sob teste sobe na **porta 3100**,
separado do `pnpm dev` na 3000 — se dividissem a porta, o Playwright reusaria o servidor de
desenvolvimento e escreveria no banco errado sem avisar.

Uma guarda recusa rodar contra o banco de desenvolvimento. O seed trunca as tabelas de domínio
antes de inserir; sem ela, um `E2E_DATABASE_URL` mal apontado apagaria o seu trabalho em silêncio.

### O ciclo rápido, com servidor próprio

Rodar contra um servidor já no ar evita esperar o `pnpm build` a cada vez. Só que esse servidor
precisa falar com o banco de teste — senão o resíduo volta:

```bash
pnpm db:e2e                                              # cria e repopula collabcity_e2e
DATABASE_URL="postgresql://collabcity:collabcity@localhost:5432/collabcity_e2e" \
  BETTER_AUTH_URL=http://localhost:3100 \
  pnpm dev --port 3100

E2E_BASE_URL=http://localhost:3100 pnpm exec playwright test
```

### A sessão vem pronta, e o motivo importa

O Better Auth limita `/sign-in/email` a **10 tentativas por minuto, por IP**, e a suíte inteira sai
de `127.0.0.1`. Quando o limite estoura, o sintoma engana: a pessoa continua em `/entrar`, sem
mensagem de erro, e a suspeita cai sobre o código de sessão.

Foi exatamente o que aconteceu ao acrescentar os testes de avaliação e denúncia — a suíte passou de
uma dúzia de logins por execução e começou a falhar só no projeto `mobile`, o segundo a rodar. A
correção **não** foi afrouxar o limite, que está certo: foi parar de autenticar em cada teste.

O projeto `setup` (`e2e/auth.setup.ts`) entra uma vez em cada conta de demonstração e salva o
cookie; `chromium` e `mobile` declaram `dependencies: ["setup"]` e reaproveitam. Um teste escolhe
sua identidade com `test.use({ storageState: storageStatePath("ana") })`, e quem precisa estar
deslogado usa `ANONYMOUS` — é o caso dos testes que exercitam o próprio formulário de login, os
únicos que ainda autenticam de verdade.

Ao escrever um teste novo: se o login é **meio**, use a sessão pronta; se é **fim**, autentique.

### O banco compartilhado dentro de uma execução

Os projetos `chromium` e `mobile` rodam em paralelo contra o mesmo `collabcity_e2e`. Um teste que
escreve precisa gerar dados distinguíveis por projeto — é o que o teste de publicação faz, colocando `testInfo.project.name` no
título. Com título fixo, a asserção de um projeto pode casar com a linha criada pelo outro.

Isso vale em dobro para restrições de unicidade. `conversations` é única por
`(anúncio, interessado)` e `reports` por `(denunciante, alvo)`: dois projetos mirando o mesmo alvo
do seed brigariam pela mesma linha. Por isso os testes de avaliação e de denúncia **publicam o
próprio anúncio**, com título único, em vez de reaproveitar um do seed — o que também evita que
acolher uma denúncia arquive um anúncio de que os outros testes dependem.

## Escrevendo um teste novo

Vale a pena testar quando a resposta a alguma destas for sim:

- Um erro aqui passaria despercebido em revisão?
- Há um caso de borda numérico, de fuso ou de codificação?
- Existe uma regra de negócio que dois lugares precisam respeitar?
- É uma regressão que já aconteceu?

Não vale testar que um componente renderiza o texto que acabou de receber por propriedade.

## O que ainda não é testado

- Server Actions em isolamento — hoje só são exercitadas de ponta a ponta. O banco de teste
  dedicado já existe; falta o arranjo de transações revertidas por caso.
- Consultas com carga realista. Os planos de execução foram conferidos à mão com `EXPLAIN`; não há
  teste automatizado que trave a regressão de um índice.

Ambos estão no [roteiro](./roadmap.md).
