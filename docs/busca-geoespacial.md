# Busca geoespacial

O que distingue o CollabCity de um mural de recados é a proximidade: uma furadeira emprestada só
serve a quem pode buscá-la. Este documento explica como o filtro por raio funciona.

## `geography`, não `geometry`

O PostGIS oferece dois tipos espaciais:

| Tipo | Modelo | Unidade | Custo |
| --- | --- | --- | --- |
| `geometry` | Plano cartesiano | Graus (ou a unidade da projeção) | Barato |
| `geography` | Elipsoide WGS 84 | **Metros** | Mais caro |

Com `geometry` em SRID 4326, uma distância sai em graus — e um grau de longitude mede cerca de
111 km no equador e quase nada perto dos polos. Para um raio em quilômetros seria preciso
reprojetar para um sistema métrico local, escolhido conforme a região. Isso é viável em uma
plataforma de escopo urbano fixo, mas o CollabCity não assume país nem fuso.

`geography` resolve na origem: `ST_Distance` devolve metros, calculados sobre o elipsoide, em
qualquer ponto do globo. O custo maior é irrelevante diante do volume esperado.

## `ST_DWithin`, não `ST_Distance < raio`

Esta é a decisão que determina se a busca escala. As duas formas parecem equivalentes:

```sql
-- Correto, porém lento: calcula a distância de TODAS as linhas antes de comparar.
WHERE ST_Distance(location, :origem) <= 25000

-- Correto e rápido: o índice GiST elimina o que está fora antes de qualquer cálculo.
WHERE ST_DWithin(location, :origem, 25000)
```

A diferença está no que o planejador consegue fazer. `ST_Distance(...) <= 25000` é uma expressão
sobre o resultado de uma função: não há índice que a resolva, então o Postgres varre a tabela
inteira e calcula a distância elipsoidal linha a linha.

`ST_DWithin` é reescrito internamente como um operador de caixa envolvente (`&&`) seguido do
teste exato. O operador `&&` é indexável, e o `EXPLAIN` mostra isso:

```
Index Scan using listings_location_idx on listings
  Index Cond: (location && _st_expand('...'::geography, '25000'::double precision))
  Filter: st_dwithin(location, '...'::geography, '25000'::double precision, true)
```

O índice descarta a maior parte das linhas; o `Filter` refina o que sobrou. A distância exata
continua sendo calculada — mas só para os candidatos, não para a tabela toda.

É por isso que `searchListings` usa `ST_DWithin` no `WHERE` e projeta `ST_Distance` apenas no
`SELECT`, para exibir e ordenar:

```ts
if (origin) {
  conditions.push(sql`ST_DWithin(${listings.location}, ${origin}, ${params.radius})`);
}

const distance = origin
  ? sql<number>`ST_Distance(${listings.location}, ${origin})`
  : sql<number | null>`NULL::double precision`;
```

## O teto de raio

`clampRadius` limita a busca a 200 km. O motivo não é de produto, e sim de plano de execução: com
um raio grande o bastante para abranger a tabela inteira, o índice deixa de filtrar e a consulta
degenera em varredura completa — pagando, ainda por cima, o custo elipsoidal em cada linha.

O piso de 1 km evita o extremo oposto, em que a busca não devolve nada e parece quebrada.

```ts
export function clampRadius(meters: number): number {
  if (!Number.isFinite(meters)) return DEFAULT_RADIUS_METERS;
  return Math.min(Math.max(Math.round(meters), MIN_RADIUS_METERS), MAX_RADIUS_METERS);
}
```

## Haversine no cliente

`haversineDistance` em `src/lib/geo.ts` duplica, de forma aproximada, o que o banco faz. Não é
redundância: serve ao navegador, que às vezes precisa de uma estimativa imediata — ordenar uma
lista já carregada, decidir se vale a pena refazer a busca — sem uma ida ao servidor.

A fórmula assume esfera; o `ST_Distance` do PostGIS assume elipsoide. A diferença fica abaixo de
0,5%, o que é irrelevante para "quantos quilômetros daqui" e inaceitável para o filtro. **O banco
é sempre a autoridade.** O cliente nunca decide o que entra no resultado.

Um detalhe fácil de errar:

```ts
return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
```

O `Math.min(1, ...)` existe porque, em pontos praticamente antípodas, o erro de ponto flutuante
leva `a` a ultrapassar 1 por uma fração ínfima — e `Math.asin` de um valor maior que 1 é `NaN`.
Há um teste cobrindo exatamente esse caso.

## Busca textual em português

A coluna gerada `search_vector` usa a configuração `portuguese` do Postgres, que aplica stemming:

```sql
to_tsvector('portuguese', title || ' ' || description || ' ' || city)
```

Na prática, buscar por `voluntários` encontra "trabalho **voluntário**", e `matemática` encontra o
termo com e sem acento — ambos reduzem ao mesmo radical.

A consulta usa `websearch_to_tsquery`, que aceita a sintaxe a que as pessoas já estão acostumadas:
aspas para expressão exata, `-` para excluir, `or` para alternativa. E, ao contrário de
`to_tsquery`, não lança exceção diante de entrada malformada — o que importa quando o texto vem
direto de um campo de busca.

A ordenação por relevância usa `ts_rank`, com `created_at` como desempate.

## Como as coordenadas chegam

Três caminhos, nesta ordem de preferência:

1. **`navigator.geolocation`** — botão "Usar minha localização" nos filtros e "Detectar" no
   formulário de anúncio. Exige permissão explícita do navegador.
2. **Perfil** — `profiles.latitude`/`longitude` e `search_radius_meters` guardam a preferência
   padrão do membro.
3. **Manual** — os campos de latitude e longitude do formulário aceitam digitação.

Não há geocodificação por nome de cidade. Ela exigiria um serviço externo com limite de requisições
e política de uso próprios, o que contraria a premissa de rodar sem dependências pagas. Está
registrada no [roteiro](./roadmap.md).

## Privacidade

O ponto exato de um anúncio **nunca é exibido**. A interface mostra apenas cidade e estado; as
coordenadas servem só ao cálculo de distância no servidor. O formulário diz isso explicitamente
para quem publica.

Uma consequência a ter em mente: distância é informação. Alguém com várias contas poderia
triangular a posição de um anúncio a partir de vários pontos de origem. Mitigar isso — arredondando
a distância exibida ou deslocando o ponto por um raio aleatório — está no [roteiro](./roadmap.md).
