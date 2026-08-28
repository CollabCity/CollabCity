# ADR-0010: Hospedagem restrita a camadas gratuitas

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

CollabCity é um projeto comunitário, sem receita e sem pessoa jurídica. Um custo fixo mensal
recairia sobre quem mantém o projeto e seria a primeira coisa a matá-lo — a plataforma sairia do ar
quando alguém cancelasse um cartão.

## Decisão

Toda a arquitetura deve caber em camadas gratuitas, e nenhuma escolha pode amarrar o projeto a um
fornecedor específico. Combinação de referência:

| Componente | Serviço | Camada gratuita |
| --- | --- | --- |
| Aplicação | Vercel | 100 GB de banda |
| Banco | Neon | 0,5 GB, com PostGIS e ramificação |
| Imagens | Cloudflare R2 | 10 GB, sem taxa de saída |

O requisito real é mais fraco que a lista: **um runtime Node e um Postgres com PostGIS**.

## Alternativas consideradas

**Supabase para tudo.** Banco, autenticação e armazenamento em uma conta só, com PostGIS incluso.
Descartado por acoplamento: usar sua autenticação e suas políticas RLS tornaria a migração cara
depois. Continua sendo alternativa válida só para o Postgres.

**VPS própria.** Mais barata por unidade de recurso e sem limites artificiais, mas custa dinheiro
desde o primeiro dia e exige alguém responsável por atualização de sistema e backup.

**Railway / Render.** Boas plataformas; as camadas gratuitas hibernam ou expiram, o que é ruim para
um serviço que as pessoas precisam encontrar no ar.

## Consequências

- Nada no código conhece a plataforma. Não há SDK de fornecedor: o banco é acessado por
  `DATABASE_URL`, e o armazenamento por interface compatível com S3.
- A ramificação de banco do Neon permite dar a cada pull request um banco próprio, sem risco de
  escrita cruzada — um ganho concreto que pesou na escolha.
- As camadas gratuitas impõem limites reais: 0,5 GB de banco comporta a fase inicial, não escala
  indefinida. Quando apertar, a migração é trocar uma string de conexão.
- Serviços que cobram por usuário ativo foram evitados de propósito
  ([ADR-0008](./0008-better-auth.md)): é a métrica que cresce se o projeto der certo.
- Funcionalidades que exigiriam serviço pago ficaram fora e estão registradas no
  [roteiro](../roadmap.md): envio de e-mail, Redis para limitação de taxa distribuída,
  geocodificação em escala.
