# Design system

## Origem das cores

O repositório original trazia cinco propostas de paleta em `docs/colorPalette/`, sem indicação de
qual adotar. A escolhida foi a **Deep**, por ser a única com contraste suficiente para servir de
base a um tema claro e a um tema escuro sem reescrever os tons:

| Papel | Hex original | OKLCH |
| --- | --- | --- |
| Violeta profundo | `#4A08A6` | `oklch(0.3802 0.2092 290.12)` |
| Ameixa | `#711973` | `oklch(0.4002 0.1600 327.08)` |
| Magenta | `#BF04A0` | `oklch(0.5477 0.2388 337.77)` |
| Laranja | `#F27329` | `oklch(0.6957 0.1762 46.40)` |
| Noite | `#0D0126` | `oklch(0.1450 0.0758 292.29)` |

As paletas descartadas continuam versionadas em [`docs/colorPalette/`](./colorPalette/readme.md).

## Por que OKLCH

Os tokens em `src/app/globals.css` são declarados em OKLCH, não em hexadecimal. O motivo é
prático: OKLCH é perceptualmente uniforme, então clarear um tom é mexer só no primeiro número.

```css
--primary: oklch(0.3802 0.2092 290.12);        /* violeta profundo */
--primary-hover: oklch(0.4400 0.2092 290.12);  /* mesmo matiz, mais claro */
```

Em hexadecimal, o equivalente exigiria recalcular os três canais e ainda assim produziria um
desvio de matiz visível. Em HSL, "aumentar a luminosidade" clareia amarelos muito mais do que
azuis, porque HSL ignora a percepção. Ver [ADR-0006](./decisions/0006-tailwind-v4-e-radix-ui.md).

## Tokens semânticos

Nenhum componente usa uma cor diretamente. Todos referenciam papéis:

| Token | Uso |
| --- | --- |
| `background` / `foreground` | Fundo e texto da página |
| `card` / `card-foreground` | Superfícies elevadas |
| `primary` | Ação principal, **ofertas** |
| `secondary` | Superfícies e ênfases suaves |
| `accent` | Destaque, contadores de não lidas |
| `highlight` | Laranja da paleta, **pedidos de ajuda** |
| `muted` / `muted-foreground` | Texto secundário, fundos discretos |
| `destructive` | Remoção e erro |
| `success` | Confirmação |
| `border` / `input` / `ring` | Traços e foco |

O par `primary`/`highlight` carrega significado de domínio: **violeta é quem oferece, laranja é
quem precisa**. A distinção aparece em `intentVariant()` e é coberta por teste, para que a
convenção não se perca.

Cor nunca é o único indicador: cada anúncio traz também a etiqueta textual "Pedido" ou "Oferta".

## Temas

O tema claro é o padrão em `:root`; o escuro sobrescreve os mesmos tokens em `.dark`. A troca é
feita pelo `next-themes` com estratégia de classe, respeitando `prefers-color-scheme` por padrão.

O `ThemeToggle` só mostra o ícone depois de montado. Sem isso, o servidor renderizaria um ícone
escolhido sem conhecer a preferência real e o React acusaria divergência na hidratação.

## Acessibilidade

Três decisões que valem registro:

**O anel de foco nunca é removido.**

```css
:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

`:focus-visible` (e não `:focus`) evita o anel no clique de mouse, mantendo-o na navegação por
teclado — onde ele é o único indicador de posição.

**A preferência por menos movimento é respeitada.** O bloco `prefers-reduced-motion` zera
animações e transições. É o único lugar do projeto onde `!important` é aceito, com supressão
explícita do Biome e a justificativa no comentário: a preferência do sistema precisa vencer
qualquer animação declarada depois.

**Há um link para pular a navegação.** Primeiro alvo de tabulação no layout raiz, visível apenas
quando focado, levando a `#conteudo`.

## Componentes

`src/components/ui/` traz primitivas construídas sobre [Radix UI](https://radix-ui.com), que
resolve as partes difíceis — foco preso em diálogos, navegação por setas em menus, anúncios para
leitores de tela. As variantes são declaradas com `class-variance-authority` e as classes
compostas com `cn()`, que resolve conflitos do Tailwind mantendo a última classe.

As primitivas não conhecem o domínio: recebem classes e propriedades. Os componentes de domínio
ficam um nível acima, em `src/components/`.

Um detalhe fácil de esquecer: o `Select` do Radix **não envia valor em formulário nativo**. Por
isso `SelectField`, em `listing-form.tsx`, espelha a seleção em um `<input type="hidden">` — sem
ele, a Server Action receberia o campo vazio.

Outro: `initials()` mora em `src/lib/utils.ts`, e não junto do `Avatar`. Aquele módulo é
`"use client"`, e uma função exportada de módulo cliente não pode ser chamada durante a
renderização no servidor — o erro aparece só em produção, derrubando a árvore inteira.

## Estados de carregamento

Não há `loading.tsx` na raiz. Um arquivo ali envolveria **todas** as rotas na mesma fronteira de
Suspense e mostraria um esqueleto em formato de listagem em telas que não são listagens.

O carregamento é declarado onde faz sentido: `app/anuncios/page.tsx` envolve apenas os resultados
em `<Suspense>`, com uma `key` derivada dos filtros — assim o esqueleto reaparece a cada mudança
de filtro, enquanto o cabeçalho e os controles permanecem visíveis e utilizáveis.
