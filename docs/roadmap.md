# Roteiro

O que está fora do escopo atual, com o motivo. A ordem dentro de cada bloco é aproximadamente a de
prioridade.

## Limitações conhecidas

### Limitação de taxa em memória

`src/server/rate-limit.ts` guarda os contadores no processo. Com várias réplicas, o limite efetivo
é multiplicado pelo número de instâncias.

Resolver exige um armazenamento compartilhado. Redis é o caminho óbvio, mas acrescenta um serviço
com custo — o que contraria a premissa de camada gratuita. Uma alternativa a avaliar é usar o
próprio Postgres, com uma tabela de contadores e `INSERT ... ON CONFLICT DO UPDATE`: mais lento que
Redis, mas sem infraestrutura nova.

### Mensagens sem tempo real

A conversa atualiza a cada navegação. Não há WebSocket nem polling. Para o volume esperado é
aceitável, mas a experiência fica aquém do que as pessoas esperam de um chat.

### Sem verificação de e-mail

`requireEmailVerification` está desligado porque depende de um provedor de envio. Resend e
Postmark têm camadas gratuitas viáveis; falta decidir e integrar.

Isso pesa mais desde que existem avaliações: enquanto criar conta for gratuito e instantâneo,
abandonar uma avaliação ruim também é, e a reputação acaba pesando sobretudo sobre quem age de
boa-fé e fica. Ver [ADR-0016](./decisions/0016-avaliacoes-presas-a-conversas.md).

### Sem geocodificação por nome

Não há como digitar "Boa Viagem, Recife" e obter coordenadas. É preciso usar a geolocalização do
navegador ou digitar latitude e longitude.

Nominatim (OpenStreetMap) é gratuito, mas a política de uso exige atribuição, limita a uma
requisição por segundo e proíbe uso pesado sem instância própria. Photon e a API do IBGE para
municípios brasileiros são alternativas.

### Sem Content-Security-Policy

Exige tratar os scripts inline do Next com nonce, o que interage com o streaming de forma não
trivial. Os demais cabeçalhos de segurança já estão configurados.

### Distância pode revelar posição

A interface só mostra cidade e estado, mas a distância exibida é exata. Com várias contas, dá para
triangular a posição de um anúncio a partir de origens diferentes.

Mitigações a avaliar: arredondar a distância exibida em faixas ("menos de 2 km", "2 a 5 km"), ou
deslocar o ponto armazenado por um vetor aleatório fixo por anúncio.

### Imagens não são reprocessadas no servidor

Ordem e texto alternativo já se editam na tela do anúncio. O que permanece: nada re-codifica a
imagem no servidor: a validação garante que o arquivo é do formato que diz ser,
não que seja inofensivo em todo decodificador. Reprocessar exigiria `sharp`, descartado na ADR.

## Produto

- **Retorno por e-mail sobre decisões.** Quem denuncia não sabe o desfecho; quem é suspenso só
  descobre ao tentar entrar; quem contesta só descobre ao voltar. Todos dependem do provedor de
  envio que ainda falta.
- **Prazo para responder a uma contestação.** Nada além da ordem da fila pressiona a moderação a
  responder, e uma contestação pode ficar em aberto indefinidamente. Reverter automaticamente pelo
  silêncio foi descartado na [ADR-0021](./decisions/0021-contestacao-de-decisoes.md) — premiaria
  quem age de má-fé.
- **Suspensão com prazo.** Hoje toda suspensão é por tempo indeterminado e só termina por
  reativação manual. Um prazo automático exigiria processo agendado ou cálculo em toda leitura.
- **Termos de uso e política de privacidade.** `/seguranca` explica o funcionamento e diz
  explicitamente que não substitui os termos. Falta o documento formal, com revisão jurídica.
- **Confirmação da troca.** `listings.status = 'fulfilled'` hoje é marcado só pelo autor, sem a
  outra parte confirmar, e por isso não é exibido como sinal público no perfil. Uma confirmação de
  duas pontas daria um contador de trocas concluídas — sinal que não infla como média de estrelas.
- **Notificação por e-mail.** Aviso de mensagem nova. Depende do mesmo provedor de envio da
  verificação de conta.
- **Mapa.** A busca é uma lista; um mapa comunicaria a distribuição espacial muito melhor.
  MapLibre com telas do OpenStreetMap evita dependência paga.
- **Recorrência.** Mutirões e oficinas se repetem; hoje exigem um anúncio novo a cada edição.
- **Organizações.** Uma conta hoje é sempre uma pessoa. ONGs e coletivos precisariam de perfil
  próprio, com mais de um responsável.

## Técnico

- **Testes de Server Action isolados.** Hoje só são exercitadas de ponta a ponta. Exigiria um banco
  de teste dedicado, com cada caso em transação revertida.
- **Teste de regressão de plano de consulta.** Os planos foram conferidos à mão com `EXPLAIN`; nada
  impede que um índice seja perdido sem ninguém notar.
- **Internacionalização.** A interface está em português. A estrutura de rótulos em
  `src/lib/taxonomy.ts` já separa o valor do banco da tradução, o que facilita, mas as URLs e os
  textos estão fixos.
- **Acessibilidade auditada.** As primitivas do Radix dão uma base sólida e há cuidado com foco,
  movimento e contraste, mas não houve auditoria com leitor de tela.
- **Observabilidade.** Não há coleta de erros nem métricas. Sentry e a telemetria da Vercel têm
  camadas gratuitas.
- **Paginação por cursor.** A busca usa `LIMIT/OFFSET`, que degrada em páginas profundas. Com o
  volume atual não importa; com volume real, importaria.

### Expurgo depende de agendador externo

O prazo de arrependimento só é executado quando alguém chama `/api/manutencao/expurgo`. A esteira
do GitHub faz isso uma vez por dia, mas **em uma instância sem os segredos configurados nenhuma
exclusão acontece** — a linha fica pendente e a pessoa acredita que foi excluída. Ver
[ADR-0024](./decisions/0024-prazo-de-arrependimento-e-politica-de-privacidade.md).

### Termos de uso formais

`/privacidade` já é uma política estruturada, com bases legais e versão. Faltam os **termos de
uso**, e as duas páginas seguem dizendo de si mesmas que não substituem revisão jurídica antes de
uso comercial.

### Monetização além da publicidade

Publicidade paga por audiência, e a plataforma tem transações, não audiência: a R$ 5 por mil
visualizações, mil reais por mês exigiriam duzentas mil visualizações. Duas alternativas de melhor
encaixe estão desenhadas e não implementadas — **anúncio destacado**, restrito a anúncios `paid`
para que doação nunca dispute por dinheiro, e **plano de organizações**, que já é item de produto
aqui. Ver [ADR-0022](./decisions/0022-medicao-e-publicidade-com-consentimento.md).

## Fora de escopo

- **Pagamentos.** A plataforma registra que uma troca é paga, mas não intermedia valores. Fazê-lo
  traria obrigações regulatórias desproporcionais ao projeto.
- **Aplicativo nativo.** A aplicação web é responsiva. Um app exigiria a API pública que hoje não
  existe.
