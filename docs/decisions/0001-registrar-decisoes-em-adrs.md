# ADR-0001: Registrar decisões em ADRs

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

O repositório anterior era um esqueleto de `create-next-app` com um README descrevendo a visão do
produto. Não havia registro de por que Next.js, por que Netlify, por que aquelas cinco paletas de
cor — nem qual delas valia.

Em um projeto comunitário isso custa caro. Quem chega precisa reconstruir o raciocínio por
arqueologia de commits, e acaba ou repetindo escolhas sem entender o motivo, ou revertendo-as sem
perceber a restrição que as originou.

## Decisão

Toda decisão técnica com alternativa razoável é registrada como ADR em `docs/decisions/`, numerada
sequencialmente e imutável depois de aceita. Uma decisão revista não é editada: um ADR novo a
substitui, e o antigo é marcado como tal.

## Alternativas consideradas

**Documentar no README.** Ele descreve o estado atual, não o histórico. Registrar ali o que foi
descartado o tornaria ilegível para quem só quer rodar o projeto.

**Wiki do GitHub.** Fica fora do repositório: não é revisada em pull request, não versiona junto do
código e desatualiza sem que ninguém perceba.

**Não documentar.** É a situação de onde este projeto veio.

## Consequências

- Discordar fica mais fácil, não mais difícil: há um alvo explícito para a discussão.
- Cada decisão relevante custa alguns minutos a mais.
- ADRs desatualizados são pior que nenhum. A regra de nunca editar um ADR aceito — só substituir —
  existe para que o registro continue confiável.
