# ADR-0005: Drizzle ORM em vez de Prisma

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

Era preciso escolher a camada de acesso a dados. A restrição decisiva veio do
[ADR-0004](./0004-postgresql-com-postgis.md): boa parte das consultas centrais usa funções PostGIS
(`ST_DWithin`, `ST_Distance`) e tipos que nenhum ORM modela nativamente.

## Decisão

Drizzle ORM, com o schema declarado em TypeScript e migrações SQL versionadas em `drizzle/`.

## Alternativas consideradas

**Prisma.** Mais popular e com ferramental mais maduro. Descartado por dois motivos concretos:

1. O tipo `geography` não é suportado. Seria preciso declará-lo como `Unsupported("geography")`,
   o que o torna invisível ao cliente tipado — e toda consulta espacial cairia em `$queryRaw`, sem
   tipos, exatamente na parte mais importante do sistema.
2. Colunas geradas exigiriam SQL manual fora do schema, com o risco de o Prisma tentar removê-las
   na migração seguinte.

**Kysely.** Excelente construtor de consultas tipado, e lidaria bem com o SQL bruto. Perde por não
trazer migrações nem declaração de schema: precisaríamos somar uma segunda ferramenta.

**SQL puro com `postgres.js`.** Controle total e nenhuma camada. Custaria tipagem manual de cada
resultado e migrações à mão — trabalho que se paga rápido em erro de digitação.

## Consequências

- O tipo `geography` é declarado com `customType`, e os fragmentos PostGIS entram como `sql` com
  interpolação — que gera **parâmetros vinculados**, não concatenação de texto.
- O `drizzle-kit` gera as migrações, mas o SQL precisa ser revisado antes do commit. Um exemplo
  real: `geography(Point, 4326)` sai citado como identificador, o que o Postgres rejeita; o tipo é
  declarado sem typmod, e o SRID é garantido pela expressão da coluna gerada.
- O schema em TypeScript é a fonte da verdade, e os tipos de linha saem dele com
  `$inferSelect`/`$inferInsert`.
- Menos automação que o Prisma: sem interface gráfica equivalente ao Prisma Studio em maturidade, e
  sem geração de cliente.
