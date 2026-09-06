# ADR-0019: Imagens nos anúncios

- **Situação:** aceita
- **Data:** 2026-09-05

## Contexto

O schema tinha `listing_images` desde o início, as consultas já traziam a capa, o `ListingCard` já
a renderizava e o `next.config.ts` já liberava o domínio do R2. Faltava a ponta que ninguém
escreveu: o envio. Na prática os anúncios eram só texto, e a página de detalhe buscava
`listing.images` sem exibir nada — a lacuna estava registrada no [roteiro](../roadmap.md).

Duas restrições delimitaram a solução. A primeira é a
[ADR-0010](./0010-hospedagem-em-camada-gratuita.md): o projeto se hospeda em camada gratuita, e em
hospedagem serverless o sistema de arquivos é efêmero e somente leitura. A segunda é que uma foto
de celular passa fácil de 5 MB, e subir isso de uma conexão móvel é lento o bastante para a pessoa
desistir no meio.

## Decisão

**Dois destinos, escolhidos por `STORAGE_DRIVER`**, como o `env.ts` já previa: disco local para
desenvolvimento e qualquer serviço compatível com a API do S3 — na prática o Cloudflare R2 — para
produção.

As variáveis se chamam `S3_*` porque é o nome do protocolo, e o nome engana: **a AWS S3 não é o
alvo e não caberia na premissa de camada gratuita** da ADR-0010. Ela não tem free tier permanente e
cobra egresso, que é exatamente o custo dominante de servir imagem. O R2 oferece 10 GB de
armazenamento, 1 milhão de escritas e 10 milhões de leituras por mês, e **não cobra egresso** — com
as fotos reduzidas no navegador, isso dá na ordem de 50 mil imagens. O `.env.example` registra a
distinção, porque o nome da variável convida ao engano.
`assertStorageConfigured` falha na partida quando `STORAGE_DRIVER=s3` e falta variável, em vez de
deixar o erro aparecer como falha de upload na primeira pessoa que tentar publicar uma foto.

**Redução no navegador, não no servidor.** A imagem é redimensionada por `canvas` antes de subir.
Isso evita o `sharp`, que é dependência nativa e complica o deploy em camada gratuita, e economiza
banda de quem envia. **É conforto, não validação.**

**A validação é por bytes, no servidor.** O `Content-Type` que o navegador manda é escolhido por
quem manda, então não decide nada: `detectImageType` lê a assinatura no início do arquivo. Valem
JPEG, PNG e WebP.

**SVG fica de fora, deliberadamente.** SVG é XML, aceita `<script>`, e um arquivo servido da mesma
origem da aplicação viraria XSS. Por não ter assinatura binária, ele nunca casa na detecção.

**A chave do arquivo é coluna própria**, `listing_images.storage_key`, separada da `url`. É ela que
permite apagar o objeto: a URL pública pode ganhar CDN ou domínio próprio, e derivar a chave dela
quebraria assim que esse endereço mudasse.

**Fotos entram no mesmo envio da publicação, mas se gerenciam à parte na edição.** As naturezas são
diferentes: o texto se salva de uma vez, ao enviar; cada foto entra e sai na hora. Se as imagens
falharem numa publicação, o anúncio **não** é desfeito — ele vai ao ar e a pessoa é levada à edição
com o erro explicado.

**O seed gera as imagens pelo mesmo caminho do envio real.** `placeholderPng` produz um PNG de
gradiente sem dependência nenhuma, e o seed o grava por `putImage`. Assim um `STORAGE_DRIVER`
quebrado aparece ao popular o banco, e não na primeira pessoa que tentar publicar uma foto.

## Alternativas consideradas

**`sharp` no servidor.** É o padrão da comunidade e faria o corte e a compressão com qualidade
melhor. Descartado pelo binário nativo: encarece a imagem de deploy, quebra em alguns runtimes de
camada gratuita e adiciona uma superfície de decodificação de imagem no servidor. A redução no
cliente resolve o problema real — o tamanho do que trafega — sem nada disso.

**Aceitar o `Content-Type` do navegador.** Uma linha em vez de vinte, e nenhuma garantia: o valor é
escolhido por quem envia.

**Guardar a imagem no Postgres, em `bytea`.** Dispensaria o armazenamento externo e a configuração.
Descartado porque infla o banco, atrapalha backup e faz cada leitura de imagem passar pela conexão
do banco — o recurso mais escasso da camada gratuita.

**Upload direto do navegador para o R2, com URL assinada.** Tira o arquivo do servidor da aplicação
e é o desenho certo em escala. Descartado por ora: exigiria expor política de assinatura ao
cliente e validar o conteúdo **depois** do fato, quando o arquivo já está lá.

## Consequências

- `STORAGE_DRIVER=local` **não serve para produção**, e isso está escrito no módulo. Um deploy
  serverless com o padrão perderia os arquivos.
- Nada re-codifica a imagem no servidor. A validação garante que o arquivo é do formato que diz
  ser, não que ele seja inofensivo em todo decodificador do mundo. Os cabeçalhos já configurados —
  `X-Content-Type-Options: nosniff` — e o `Content-Type` vindo dos bytes detectados são o que
  limita o estrago.
- `attachImages` **não** confere autoria; quem chama já conferiu. Está escrito na própria função,
  porque é o tipo de coisa que passa despercebida em uma chamada nova.
- A remoção do arquivo nunca lança: a linha do banco já saiu, e falhar ali deixa um arquivo órfão —
  desperdício de espaço, não perda de dado.
- A ordem se muda por botões de subir e descer, e não por arrastar: arrastar exige ponteiro
  preciso, não funciona com teclado e é um problema em leitor de tela. A troca é feita em
  transação, reescrevendo a lista inteira — são no máximo quatro itens, e assim posições duplicadas
  de qualquer inserção antiga se resolvem sozinhas.
- O texto alternativo é opcional e tem formulário próprio por imagem: um formulário só, com quatro
  campos `alt`, deixaria o leitor de tela sem saber qual descrição pertence a qual foto.
