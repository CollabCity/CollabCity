# ADR-0023: Exportação e exclusão de conta

- **Situação:** aceita
- **Data:** 2026-09-06

## Contexto

A [ADR-0022](./0022-medicao-e-publicidade-com-consentimento.md) registrou duas lacunas de LGPD que a
própria página `/privacidade` declarava: não havia como a pessoa **baixar os próprios dados**
(art. 18, II e V) nem **excluir a conta** (art. 18, VI) pela interface. Os dois dependiam de pedido
manual, o que na prática é não atender.

A exclusão trouxe um problema que não é jurídico, e sim de modelo de dados. Apagar a linha em
`user` propagava em cascata para mensagens, conversas e avaliações — inclusive as **da outra
pessoa**. Pior: `conversations.listing_id` era `NOT NULL` com cascata, então apagar um anúncio
destruía a conversa inteira. O direito de uma pessoa viraria a perda do histórico de outra.

## Decisão

**A conversa deixou de depender do anúncio.** `conversations.listing_id` passou a ser anulável, com
`ON DELETE SET NULL`. Sem essa mudança, nenhuma exclusão honesta seria possível: ou os anúncios
ficavam no ar, ou a conversa de quem ficou era destruída junto. A interface passa a mostrar
"Anúncio removido" quando a origem sumiu.

**Exclusão de verdade** para o que é só da pessoa: perfil, anúncios, as fotos deles no
armazenamento, anúncios salvos, credenciais e todas as sessões.

**Anonimização** para a linha em `user`. Nome vira "Membro removido", e-mail vira um endereço único
em `.invalid` — domínio reservado pela RFC 2606, que nunca resolve e não colide com o de ninguém —,
foto some. A linha permanece porque mensagens e avaliações pendem dela. O art. 12 é explícito: dado
anonimizado não é dado pessoal, então o direito está atendido sem destruir o registro alheio.

**Permanece atribuído à conta anonimizada** o que é de duas pessoas: mensagens enviadas, avaliações
escritas sobre outros, e os registros de moderação que documentam decisões sobre terceiros.

**A confirmação é digitar o próprio e-mail.** A ação é irreversível, e um botão vermelho sozinho não
é decisão suficiente — nem protege de um clique errado.

**A sessão é encerrada pelo Better Auth, não só apagando linhas.** A biblioteca guarda a sessão em
cookie por cinco minutos para poupar consulta ao banco; sem `signOut`, a pessoa seguiria navegando
como se a conta existisse.

**A exportação é rota, não Server Action**, porque o resultado é um arquivo: só uma resposta HTTP
carrega `Content-Disposition`. Ela responde **401**, e não redireciona para o login, porque é API.

**Três coisas ficam fora da exportação**: quem denunciou a pessoa — caso contrário exportar viraria
o jeito legítimo de descobrir —, e-mail e contato de terceiros, e identificadores internos que não
sirvam a quem exporta. As outras pessoas aparecem só pelo nome de exibição, que já é público.

**As mensagens da outra parte entram.** A conversa é documento de duas pontas, e devolver metade
produziria um registro enganoso de algo que a pessoa já lê na própria tela.

**A tela diz, antes de qualquer botão, o que some e o que fica**, item por item. Uma exclusão que
promete mais do que faz é pior que uma que explica menos.

## Alternativas consideradas

**Apagar a linha em `user` e deixar a cascata agir.** É a leitura literal de "eliminação" e destrói
dado de terceiros: a conversa de quem ficou perde metade, e as avaliações que a pessoa escreveu
sobre outros somem, alterando a reputação de quem não pediu nada.

**Manter os anúncios, apenas arquivando.** Evitaria mexer no schema. Descartado porque o anúncio é
conteúdo da pessoa e pode conter dado pessoal no texto — um telefone, um endereço. Preferimos
alterar a chave estrangeira a manter conteúdo que deveria sumir.

**Exportar só as mensagens que a pessoa escreveu.** Mais conservador com dado de terceiro e pior
como documento: uma conversa com buracos não serve para nada, e o conteúdo já é visível na tela.

**Exclusão com prazo de arrependimento.** Comum e útil contra arrependimento, e adiaria o efeito de
um direito que a lei trata como exercível. Descartado por ora; a tela compensa deixando explícito
que não há volta e sugerindo baixar os dados antes.

## Consequências

- `conversations.listing_id` agora é anulável. **Toda consulta que junta conversa e anúncio precisa
  de `LEFT JOIN`** e de tratar o título nulo; três já foram ajustadas.
- Uma conta excluída continua existindo como linha anônima. Quem for contar membros precisa
  descontá-las, e quem exibir nomes verá "Membro removido".
- Apagar arquivos do armazenamento acontece **fora** da transação: falhar ali deixa arquivo órfão,
  não dado pessoal no ar, porque as linhas já foram.
- Não há exclusão em massa nem por pedido administrativo — só a própria pessoa exclui a própria
  conta.
- Continua faltando a política de privacidade formal, com revisão jurídica. A página `/privacidade`
  segue dizendo isso de si mesma.
