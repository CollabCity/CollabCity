# Política de segurança

## Relatando uma vulnerabilidade

**Não abra uma issue pública para relatar uma vulnerabilidade.** Uma issue é visível a todos,
inclusive a quem poderia explorá-la antes da correção.

Use o canal privado do GitHub:

1. Vá em **Security** → **Report a vulnerability** no repositório.
2. Descreva o problema, o impacto e como reproduzi-lo.

Se preferir, entre em contato em privado com quem mantém o projeto.

## O que incluir

- O tipo de problema (bypass de autorização, injeção, exposição de dado, ...).
- O caminho até o arquivo ou a rota afetada.
- Passos para reproduzir, e o que você observou.
- O impacto: o que alguém conseguiria fazer explorando isso.

Prova de conceito ajuda muito, mas não é obrigatória.

## O que esperar

- **Confirmação de recebimento** em até 5 dias úteis.
- **Avaliação inicial** — se é uma vulnerabilidade e qual a gravidade — em até 10 dias úteis.
- Manteremos você informado do andamento até a correção.
- Se quiser, seu crédito aparecerá nas notas da versão que corrigir o problema.

Este é um projeto comunitário, mantido por voluntários. Faremos o possível dentro desses prazos.

## Escopo

Está no escopo o código deste repositório: a aplicação, as consultas, as Server Actions, a
configuração de autenticação e as migrações.

Está fora do escopo:

- Vulnerabilidades em serviços de terceiros (Vercel, Neon, GitHub). Relate a eles.
- Ausência de funcionalidades já documentadas como não implementadas em
  [docs/roadmap.md](./docs/roadmap.md) — por exemplo, a inexistência de Content-Security-Policy ou o
  fato de a limitação de taxa da aplicação ser por processo.
- Ataques que exigem acesso físico à máquina ou credenciais já comprometidas.

## Limitações conhecidas

Por transparência, algumas propriedades de segurança já estão documentadas e reconhecidas:

| Limitação | Onde está registrada |
| --- | --- |
| Limitação de taxa da aplicação é por processo | [docs/seguranca.md](./docs/seguranca.md) |
| Não há Content-Security-Policy | [docs/roadmap.md](./docs/roadmap.md) |
| Verificação de e-mail desligada | [docs/roadmap.md](./docs/roadmap.md) |
| Distância exibida pode permitir triangulação | [docs/busca-geoespacial.md](./docs/busca-geoespacial.md) |

Relatos sobre esses pontos continuam bem-vindos — sobretudo se você identificar um impacto maior do
que o que registramos, ou souber de uma mitigação viável dentro das restrições do projeto.
