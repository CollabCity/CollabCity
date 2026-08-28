# ADR-0014: Português como idioma do produto

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

O repositório original estava em inglês — README, guia de contribuição e o texto do produto. O
projeto, no entanto, nasce em contexto brasileiro, e a proposta é hiperlocal: as pessoas que
publicam e respondem anúncios estão na mesma cidade.

## Decisão

Interface, URLs, documentação e comentários de código em português. Os identificadores de código
(nomes de variáveis, funções, tabelas e colunas) permanecem em inglês.

As URLs seguem o idioma da interface: `/anuncios`, `/painel`, `/mensagens`, `/entrar`.

## Alternativas consideradas

**Tudo em inglês.** Ampliaria o alcance para contribuição internacional. Descartado porque o
público-alvo é local: uma interface em inglês excluiria exatamente quem a plataforma quer atender.

**Internacionalização desde o início.** Uma biblioteca de i18n com português e inglês. Descartado
por custo antes da hora: dobraria o esforço de cada texto sem que exista um segundo público. A
estrutura já facilita a adição depois — `src/lib/taxonomy.ts` separa o valor persistido no banco
(em inglês, estável) do rótulo exibido.

**Identificadores em português.** Descartado: bibliotecas, frameworks e o próprio SQL usam inglês,
e misturar os dois em uma mesma linha (`const anuncioList = await db.select()`) piora a leitura.

## Consequências

- Os enums do banco guardam `need`/`offer`, `skill`/`item`/`volunteer`, e a tradução vive na borda
  de apresentação. Mudar um rótulo não exige migração.
- Há teste travando a correspondência entre enums e rótulos: um valor novo sem tradução apareceria
  como `undefined` na tela.
- A busca textual usa a configuração `portuguese` do Postgres, com stemming e tratamento de
  acentos. Suportar um segundo idioma exigiria uma segunda coluna `tsvector` ou uma escolha por
  anúncio.
- Contribuição internacional fica mais difícil. É um custo aceito conscientemente.
