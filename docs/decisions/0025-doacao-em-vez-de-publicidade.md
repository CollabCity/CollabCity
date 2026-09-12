# ADR-0025: Doação em vez de publicidade

- **Situação:** aceita
- **Data:** 2026-09-11
- **Substitui parcialmente:** [ADR-0022](./0022-medicao-e-publicidade-com-consentimento.md), na
  parte de publicidade. A medição com consentimento continua valendo.

## Contexto

A [ADR-0022](./0022-medicao-e-publicidade-com-consentimento.md) adotou o Google AdSense como fonte
de receita. Depois de implementada, uma incompatibilidade apareceu: as
[diretrizes de uso justo da Vercel](https://vercel.com/docs/limits/fair-use-guidelines) reservam o
plano Hobby ao uso **pessoal e não comercial** e listam a exibição de anúncios — o AdSense pelo
nome — como uso comercial. A [ADR-0010](./0010-hospedagem-em-camada-gratuita.md) exige que o
projeto caiba em camadas gratuitas. As duas decisões não cabiam juntas.

As mesmas diretrizes abrem uma exceção explícita: **pedir doação não é uso comercial**.

A conta pesou tanto quanto o contrato. No Brasil, nicho geral paga de R$ 2 a R$ 8 por mil
visualizações; a R$ 5 de RPM, cobrir os US$ 20 mensais do plano Pro exigiria algo como vinte mil
visualizações por mês — só para empatar com o custo que a própria publicidade criou. A plataforma
tem transações, não audiência, e a audiência que ela teria é de pessoas pedindo ajuda.

## Decisão

**Sai o AdSense.** Componentes, variáveis de ambiente e a categoria `ads` do consentimento foram
removidos, não desligados por configuração. Um interruptor sobrevivente seria um convite a religar
sem refazer esta conversa.

**Entra um canal de apoio**, em `/apoie`, apontado por `NEXT_PUBLIC_DONATION_URL` e
`NEXT_PUBLIC_DONATION_PIX`. Sem nenhuma das duas a página responde 404 e o rodapé não a oferece: o
projeto é auto-hospedável, e quem recebe é quem opera cada instância — o mesmo raciocínio já usado
para o controlador de dados na [ADR-0024](./0024-prazo-de-arrependimento-e-politica-de-privacidade.md).

**O dinheiro não passa pela aplicação.** O canal é externo, e a plataforma não processa valores nem
guarda dado bancário. Fazer diferente traria obrigações regulatórias que a
[ADR-0002](./0002-reconstruir-em-vez-de-migrar.md) já havia colocado fora de escopo.

**Doar não compra nada** — nem destaque na busca, nem selo, nem prioridade. A página diz isso com
todas as letras, porque é a regra que impede a monetização de corroer o propósito: em ajuda mútua,
quem tem menos dinheiro costuma ser quem mais precisa ser visto.

**O consentimento não sobe de versão.** A regra da ADR-0022 manda subir `CONSENT_VERSION` quando o
que se coleta muda, e ela existe para impedir que um "sim" estreito cubra uma coleta maior. Aqui a
coleta encolheu: quem aceitou medição e publicidade aceitou medição, e quem recusou continua
recusando. Subir a versão só produziria uma pergunta a mais, sobre menos. `parseConsent` ignora a
chave `ads` que os cookies já gravados ainda carregam, e há teste cobrindo os dois lados dessa
herança.

## Alternativas consideradas

**Pagar o Vercel Pro, US$ 20 por pessoa/mês.** Nada mudaria no código. Descartado porque inverte a
ordem: criaria um custo fixo — exatamente o que a ADR-0010 identificou como a primeira coisa capaz
de matar o projeto — para sustentar uma receita que, pela conta acima, não cobriria esse custo tão
cedo.

**Trocar de hospedagem.** Cloudflare Workers e o plano gratuito da Netlify permitem uso comercial.
Descartado por agora: custaria adaptação de build e uma rodada inteira de testes, e nenhum dos dois
executa Next.js com a fidelidade da Vercel. Continua sendo o caminho se a publicidade voltar.

**Publicidade só nas páginas de oferta, mantendo o Hobby.** Foi o desenho original da ADR-0022, e
não resolve nada: as diretrizes falam em exibir anúncios, não em onde exibi-los.

**Gerar o QR Code do Pix na página.** Exigiria montar o payload EMV com CRC16 e uma biblioteca de
QR. Descartado por ora: a chave copiável resolve, e o campo aceita qualquer formato de chave sem a
aplicação precisar entender o padrão.

## Consequências

- **A ADR-0010 volta a se sustentar inteira.** Sem publicidade, a instalação cabe no plano Hobby, e
  o conflito registrado entre as duas ADRs deixa de existir.
- **A política de privacidade encolheu**, e subiu para a versão 1.1: um tratamento a menos na
  tabela, e o Google Analytics passa a ser o único terceiro que recebe qualquer coisa.
- **A receita esperada é próxima de zero**, e isso é aceito. A alternativa era uma receita também
  próxima de zero com um custo fixo em dólar do lado de fora.
- **Quem recebe a doação é uma pessoa física**, sem forma jurídica, sem recibo e sem separação
  entre dinheiro do projeto e dinheiro pessoal. Acima da faixa de isenção estadual há ITCMD a
  recolher. Está registrado no [roteiro](../roadmap.md) como coisa a reavaliar quando a doação
  virar recorrente — associação sem fins lucrativos ou intermediário fiscal são as saídas
  conhecidas, e nenhuma se justifica antes de haver dinheiro.
- A página fica invisível em desenvolvimento e em qualquer instância que não configure um canal, o
  que é o mesmo padrão da medição. Os testes de ponta a ponta configuram canais de fachada para
  poder exercitá-la.
