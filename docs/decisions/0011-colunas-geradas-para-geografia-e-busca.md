# ADR-0011: Colunas geradas para geografia e busca textual

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

Duas colunas precisam ser derivadas de outras a cada gravação:

- `location`, o ponto `geography` calculado de `latitude` e `longitude`, indexado com GiST;
- `search_vector`, o `tsvector` em português calculado de título, descrição e cidade, indexado com
  GIN.

Se qualquer uma sair de sincronia com a origem, a falha é silenciosa: o anúncio some da busca por
raio ou da busca textual sem erro nenhum, e ninguém percebe até alguém reclamar.

## Decisão

Ambas são colunas `GENERATED ALWAYS AS ... STORED`, calculadas pelo Postgres. A aplicação nunca
escreve nelas. `latitude` e `longitude` são a fonte da verdade.

```sql
"location" geography GENERATED ALWAYS AS
  (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED
```

## Alternativas consideradas

**Atualizar na aplicação.** Todo `INSERT` e `UPDATE` calcularia o ponto e o vetor. Funciona até
alguém escrever uma consulta de correção, uma migração de dados ou um script de importação que
esqueça — e nada acusa o erro.

**Gatilhos.** Garantem a consistência tanto quanto colunas geradas, mas ficam invisíveis: o
comportamento não aparece na definição da tabela, e sim em um objeto separado que ninguém lê ao
depurar.

**Índices sobre expressão.** `CREATE INDEX ... ON listings USING gist (ST_SetSRID(...))` evita a
coluna. Serviria para o filtro, mas exigiria repetir a expressão idêntica em cada consulta para que
o índice fosse usado — frágil e ruidoso.

## Consequências

- Impossível dessincronizar. A garantia é do banco, não de disciplina.
- Corrigir a posição de um anúncio é atualizar dois números; o ponto e o índice acompanham.
- A expressão precisa ser imutável. `to_tsvector` só é imutável com a configuração explícita — daí
  `to_tsvector('portuguese', ...)`, e não a variante que depende da configuração da sessão.
- A extensão PostGIS precisa existir **antes** da criação das tabelas, porque o `CREATE TABLE`
  avalia a expressão. Por isso `src/db/migrate.ts` roda `CREATE EXTENSION` antes do migrador, em
  vez de depender de `drizzle-kit migrate` direto.
- O tipo é declarado como `geography` sem typmod: o `drizzle-kit` cita tipos desconhecidos como
  identificadores, e `"geography(Point, 4326)"` seria rejeitado pelo Postgres. O SRID e a
  geometria de ponto ficam garantidos pela própria expressão.
- Colunas geradas ocupam espaço em disco e custam escrita. Para este volume, é irrelevante diante
  do que se ganha.
