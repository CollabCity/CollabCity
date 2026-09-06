# Contribuindo com o CollabCity

Obrigado por dedicar seu tempo ao projeto.

O CollabCity é feito por pessoas, para pessoas. Aceitamos contribuições de todo tipo — e várias
delas não exigem escrever uma linha de código: ideias, documentação, arte, tradução, relato de
problema, revisão de texto.

## Antes de tudo

Leia o [Código de Conduta](./CODE_OF_CONDUCT.md). Ele vale para todos os espaços do projeto.

Se você nunca contribuiu com um projeto open source, a série gratuita
[How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)
cobre o básico de fork, branch e pull request.

## Preparando o ambiente

O guia completo está em [docs/getting-started.md](./docs/getting-started.md). O resumo:

```bash
pnpm install
cp .env.example .env.local     # gere o segredo com: openssl rand -base64 32
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev
```

## Abrindo uma issue

Issues são valiosas por si só:

- **Ideias** mostram caminhos que ninguém tinha considerado.
- **Problemas** revelam onde o projeto está falhando.
- **Perguntas** apontam onde a experiência ou a documentação confunde.

Há modelos para relato de erro, sugestão de funcionalidade e correção de documentação.

Antes de abrir, procure se já existe uma issue parecida. Se existir, comentar nela costuma ajudar
mais que abrir outra.

## Escolhendo o que fazer

Olhe a [lista de issues](https://github.com/CollabCity/CollabCity/issues). As marcadas com
`good first issue` foram escolhidas por não exigirem contexto profundo do projeto.

Comente na issue antes de começar, para evitar que duas pessoas façam o mesmo trabalho.

## Fluxo de trabalho

1. Faça fork e crie um branch a partir de `main`:

   ```bash
   git checkout -b feat/busca-por-categoria
   ```

2. Faça as alterações.

3. Verifique tudo antes de abrir o pull request:

   ```bash
   pnpm check     # lint + tipos + testes
   ```

   Se você mexeu em fluxo de navegação, autenticação ou busca, rode também os testes de ponta a
   ponta:

   ```bash
   pnpm test:e2e
   ```

   Eles preparam sozinhos o próprio banco (`collabcity_e2e`) e não tocam no seu de
   desenvolvimento — ver [ADR-0015](./docs/decisions/0015-banco-dedicado-para-testes-de-ponta-a-ponta.md).

4. Abra o pull request descrevendo **o que muda e por quê**. Se resolve uma issue, referencie-a
   (`Resolve #12`).

## Padrões do código

Boa parte é verificada automaticamente pelo `pnpm check`. O que não é:

**Comentários explicam o porquê, não o quê.** O código já diz o que faz. Um comentário útil
registra a restrição que levou àquela forma:

```ts
// A condição de autoria vai no próprio UPDATE: sem uma linha correspondente
// nada é alterado, o que evita a corrida entre checar e gravar.
```

**Toda entrada é validada no servidor**, mesmo quando o formulário já validou. Server Actions são
endpoints HTTP e podem ser chamadas diretamente.

**Autorização vai dentro da instrução de escrita**, no `WHERE`. Nunca "consulta o dono, depois
grava".

**Componente é servidor por padrão.** Só use `"use client"` quando houver estado, evento ou API de
navegador. E lembre: uma função exportada de um módulo `"use client"` **não pode** ser chamada
durante a renderização no servidor.

**Texto visível em português.** Identificadores de código em inglês. Ver
[ADR-0014](./docs/decisions/0014-portugues-como-idioma-do-produto.md).

## Alterando o banco

1. Edite o schema em `src/db/schema/`.
2. Gere a migração: `pnpm db:generate`.
3. **Revise o SQL gerado** em `drizzle/`. Isso não é formalidade — o gerador nem sempre exprime
   tipos do PostGIS e colunas geradas como se espera.
4. Aplique: `pnpm db:migrate`.
5. Inclua schema e migração no mesmo commit.

## Testes

Escreva um teste quando a resposta a alguma destas for sim:

- Um erro aqui passaria despercebido em revisão?
- Há um caso de borda numérico, de fuso ou de codificação?
- É uma regressão que já aconteceu?

Não é preciso testar que um componente renderiza o texto que acabou de receber por propriedade.
Mais em [docs/testing.md](./docs/testing.md).

## Decisões técnicas

Mudanças estruturais — trocar uma biblioteca central, alterar a fronteira entre camadas, mudar a
estratégia de dados — pedem um ADR em [`docs/decisions/`](./docs/decisions/). Abra a discussão em
uma issue antes de implementar; é mais barato discordar de um texto do que de um pull request
pronto.

## Mensagens de commit

Use [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
feat: filtrar anúncios por forma de troca
fix: preservar filtros ao paginar a busca
docs: explicar por que ST_DWithin usa o índice
refactor: extrair iniciais para módulo neutro
test: cobrir raio fora dos limites
chore: atualizar dependências
```

Escreva no imperativo e descreva o efeito, não o mecanismo.

## Revisão

Pull requests são revisados por quem mantém o projeto. Perguntas na revisão são pedidos de
contexto, não críticas — e quem revisa erra também. Se você discordar, diga: a decisão melhora com
a discussão.
