# ADR-0008: Better Auth para autenticação

- **Situação:** aceita
- **Data:** 2026-08-27

## Contexto

A plataforma precisa de contas: publicar, conversar e salvar exigem identidade. A restrição de
camada gratuita ([ADR-0010](./0010-hospedagem-em-camada-gratuita.md)) pesou aqui — serviços de
identidade costumam cobrar por usuário ativo, exatamente a métrica que cresce se o projeto der
certo.

## Decisão

Better Auth, com as tabelas no próprio banco da aplicação. E-mail e senha por padrão; OAuth de
GitHub e Google habilitado condicionalmente, quando as credenciais estão configuradas.

## Alternativas consideradas

**Auth.js (NextAuth).** O padrão de fato do ecossistema. Perdeu pela ergonomia do adaptador de
banco de dados e por tipagem mais fraca; a versão 5 ainda estava em beta prolongado no momento da
decisão.

**Clerk / Auth0 / WorkOS.** Melhor experiência pronta, mas cobram por usuário ativo mensal a partir
de um limite. Além disso, tirariam a identidade do banco: uma consulta que junta anúncio e autor
viraria uma chamada de rede.

**Supabase Auth.** Boa camada gratuita, mas amarraria a plataforma inteira ao Supabase, incluindo o
banco. Preferimos manter a portabilidade.

**Implementação própria.** Sessões e hash de senha são fáceis de errar de formas silenciosas. Não é
onde este projeto deve gastar seu esforço.

## Consequências

- As tabelas `user`, `session`, `account` e `verification` seguem o contrato da biblioteca e não
  podem ser renomeadas livremente. O campo `account.issuer` passou a ser obrigatório na versão 1.7
  e é fácil de esquecer.
- Os dados públicos do membro ficam em `profiles`, separados de `user`, para que uma atualização da
  biblioteca não arraste o domínio junto.
- Os cookies são `Secure` conforme o esquema de `BETTER_AUTH_URL`, e não conforme `NODE_ENV`: um
  build de produção servido em `http` emitiria cookies que o navegador descarta.
- A biblioteca traz limitação de taxa por IP. O padrão de três tentativas de login por minuto foi
  afrouxado para dez, com justificativa registrada: sob CGNAT, um bairro inteiro compartilha um IP.
- Verificação de e-mail está desligada por depender de provedor de envio ainda não integrado.
