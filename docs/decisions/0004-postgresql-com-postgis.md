# ADR-0004: PostgreSQL com PostGIS

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

A proposta do produto depende de proximidade: uma furadeira emprestada só serve a quem consegue
buscá-la. O README original já previa "busca restrita a uma cidade, região ou raio a partir da sua
localização".

Isso exige consulta espacial indexada. Filtrar por nome de cidade não resolve — quem mora na
divisa entre Recife e Olinda está a dois quilômetros de anúncios que um filtro textual esconderia.

Restrição adicional: precisa caber em camada gratuita
([ADR-0010](./0010-hospedagem-em-camada-gratuita.md)).

## Decisão

PostgreSQL 17 com a extensão PostGIS 3.5. As coordenadas ficam em `latitude`/`longitude`, e uma
coluna `geography(Point, 4326)` gerada a partir delas é indexada com GiST.

O tipo é `geography`, não `geometry`: `ST_Distance` devolve metros calculados sobre o elipsoide, em
qualquer ponto do globo. Com `geometry` em SRID 4326 a distância sairia em graus, exigindo
reprojeção para um sistema métrico local escolhido por região — viável em escopo urbano fixo, não
em uma plataforma que não assume país.

## Alternativas consideradas

**Postgres sem PostGIS, com Haversine em SQL.** Funciona e evita a extensão, mas nenhum índice
resolve `acos(sin(...) * ...) < raio`: toda busca viraria varredura completa da tabela.

**Caixa envolvente em colunas `float`.** Indexável com B-tree e barato, mas devolve um retângulo,
não um círculo — anúncios nos cantos entrariam indevidamente. Serviria como pré-filtro; o PostGIS
já faz exatamente isso internamente, e melhor.

**MongoDB com índices `2dsphere`.** Boa busca geoespacial, mas o restante do domínio é fortemente
relacional (anúncios, categorias, conversas, mensagens, favoritos) e perderíamos integridade
referencial.

**Elasticsearch.** Resolveria geo e busca textual com folga, ao custo de um serviço a mais para
operar e sincronizar. Desproporcional.

## Consequências

- `ST_DWithin` no `WHERE` usa o índice GiST; `ST_Distance` fica no `SELECT`, só para exibir e
  ordenar. A ordem importa: inverter as duas anula o índice.
- A extensão precisa existir antes das migrações, porque as colunas geradas dependem dela. Por isso
  `src/db/migrate.ts` roda `CREATE EXTENSION` antes do migrador.
- Provedores gerenciados suportam PostGIS, mas em geral exigem habilitá-la manualmente uma vez.
- A imagem oficial `postgis/postgis` publica apenas amd64. O `docker-compose.yml` usa
  `imresamu/postgis`, multi-arquitetura, para funcionar em Apple Silicon.
- O `to_tsvector('portuguese', ...)` vem de brinde: a mesma base entrega busca textual com stemming
  sem serviço adicional.
