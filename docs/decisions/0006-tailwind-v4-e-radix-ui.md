# ADR-0006: Tailwind CSS 4 e Radix UI

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

O projeto tinha cinco propostas de paleta e nenhuma implementação. Era preciso escolher a base de
estilo e de componentes, sabendo que contribuições virão de pessoas com níveis muito diferentes de
familiaridade com CSS.

## Decisão

Tailwind CSS 4 com tokens semânticos em OKLCH, e primitivas construídas sobre Radix UI em
`src/components/ui/`.

## Alternativas consideradas

**CSS Modules.** É o que o projeto usava. Funciona, mas cada componente novo exige inventar nomes
de classe e um arquivo à parte, e nada impede que dez tons de violeta convivam.

**Uma biblioteca pronta (MUI, Chakra, Mantine).** Entregaria mais rápido. Descartada porque a
identidade visual do projeto é própria — sobrescrever o tema de uma biblioteca para chegar à paleta
Deep custaria mais que construir sobre primitivas sem estilo.

**shadcn/ui via CLI.** É essencialmente o que fizemos, mas os componentes foram escritos à mão para
que cada um seja legível e o conjunto fique restrito ao que se usa, sem arrastar dependências.

## Consequências

- As cores são declaradas em **OKLCH**, não em hexadecimal. OKLCH é perceptualmente uniforme:
  clarear um tom é mexer só no primeiro número, sem desvio de matiz. Em HSL, aumentar a
  luminosidade clareia amarelos muito mais que azuis.
- Nenhum componente usa cor direta; todos referenciam papéis (`primary`, `highlight`, `muted`).
  Trocar a paleta é reescrever um bloco de tokens.
- O par `primary`/`highlight` carrega significado de domínio — violeta para ofertas, laranja para
  pedidos — e há teste travando essa convenção.
- O Radix resolve foco preso, navegação por teclado e anúncio a leitores de tela. Em compensação,
  seu `Select` não envia valor em formulário nativo, e é preciso espelhar a seleção em um input
  oculto.
- Tailwind 4 dispensa `tailwind.config.js`: a configuração vive no CSS, em `@theme`. O Biome precisa
  de `css.parser.tailwindDirectives` ligado para não acusar as diretivas como erro de sintaxe.
