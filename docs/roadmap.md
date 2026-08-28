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

### Upload de imagens

O schema tem `listing_images` e a configuração de armazenamento existe em `src/lib/env.ts`, mas o
fluxo de envio não está implementado. Hoje os anúncios são apenas texto.

## Produto

- **Denúncia e moderação.** Não há como sinalizar um anúncio abusivo. É o item mais urgente antes
  de qualquer uso real.
- **Reputação.** Confirmação de que a troca aconteceu, e avaliação entre as partes.
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

## Fora de escopo

- **Pagamentos.** A plataforma registra que uma troca é paga, mas não intermedia valores. Fazê-lo
  traria obrigações regulatórias desproporcionais ao projeto.
- **Aplicativo nativo.** A aplicação web é responsiva. Um app exigiria a API pública que hoje não
  existe.
