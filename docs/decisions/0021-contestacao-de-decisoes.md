# ADR-0021: Contestação de decisões da moderação

- **Situação:** aceita
- **Data:** 2026-09-05

## Contexto

A [ADR-0018](./0018-canal-de-denuncia-e-moderacao.md) e a
[ADR-0020](./0020-suspensao-de-contas.md) deixaram a moderação capaz de arquivar anúncios, ocultar
avaliações e suspender contas — e as duas registraram a mesma lacuna: **quem discorda não tem para
onde ir**. A página `/conta-suspensa` chegou a dizer isso à pessoa suspensa, o que era honesto e
insuficiente.

O problema é estrutural, não de cortesia. Toda decisão de moderação é tomada com informação
parcial: quem denunciou contou um lado, e quem decidiu não ouviu o outro. Sem caminho de volta, um
engano vira permanente. A moderação também era silenciosa: um anúncio arquivado simplesmente sumia
da busca, sem nada dizer a quem o publicou.

## Decisão

**Contesta-se uma suspensão ou uma denúncia acolhida.** Como em `reports`, o alvo são duas chaves
estrangeiras e não um par `(tipo, id)`: o banco garante que existe e a cascata limpa sozinha.

**Só decisões com consequência reversível entram.** Anúncio arquivado e avaliação ocultada, porque
aceitar a contestação desfaz o que foi feito. Denúncia de conversa fica de fora: não houve remoção
de conteúdo, e não há o que desfazer.

**Uma contestação por decisão**, por restrição de unicidade. Insistir não é recurso novo.

**Quem tomou a decisão não julga a contestação dela.** É a regra que dá sentido a todo o resto:
revisar a si mesmo tende a confirmar, e a pessoa teria apenas a aparência de um segundo olhar. A
tela mostra "Esta decisão foi sua" e esconde os botões; a ação recusa mesmo que alguém contorne a
interface.

**Aceitar desfaz.** A suspensão é encerrada, o anúncio volta a `open`, a avaliação deixa de ficar
oculta, e a denúncia original passa a `dismissed` — para que a fila não continue afirmando o
contrário do que foi decidido depois.

**As ações usam `getSession`, e não `requireSession`.** Esta última redireciona quem está suspenso
para `/conta-suspensa`, o que expulsaria da própria ação a pessoa que mais precisa dela. A
autorização é feita à mão e é **mais estreita**: só a própria pessoa, e só enquanto a suspensão
estiver em vigor.

**Uma tela de decisões para cada membro** (`/painel/decisoes`), com o motivo e o botão de
contestar. Sem ela, a pessoa descobriria a decisão pela ausência do próprio anúncio.

**O texto pedido não é "defenda-se", é "o que a moderação deixou de considerar".** Quem revisa já
leu a decisão; o que falta é o que não estava lá.

## Alternativas consideradas

**Contestação por e-mail.** O mesmo defeito da denúncia por e-mail, agravado: sem vínculo com a
decisão, sem estado, sem histórico, e sem como garantir que quem revisa é outra pessoa.

**Deixar qualquer moderador revisar, inclusive quem decidiu.** Simplificaria o código e esvaziaria
o instituto. O custo da regra é real — uma equipe de uma pessoa só trava toda contestação — e é por
isso que o seed cria **duas**: sem a segunda, a regra pareceria defeito.

**Contestações ilimitadas.** Descartada: reabrir a mesma decisão indefinidamente transforma o
recurso em desgaste, e quem tem mais tempo livre ganha.

**Reverter automaticamente sem análise, se ninguém responder em N dias.** Atraente pela pressão que
cria sobre a fila, e perigoso: bastaria contestar e esperar para desfazer qualquer decisão, o que
premia justamente quem age de má-fé.

## Consequências

- A moderação deixou de ser um caminho só de ida, e a página de conta suspensa parou de admitir uma
  lacuna que agora não existe.
- **A equipe precisa de pelo menos duas pessoas.** Com uma, toda contestação fica sem quem a julgue.
  Está no seed e é o tipo de coisa que só aparece em produção quando alguém sai.
- Aceitar uma contestação sobre denúncia marca o `report` como `dismissed`. A fila de acolhidas
  encolhe quando uma decisão é revertida, e isso é intencional.
- Quem contesta não é avisado do desfecho por fora da plataforma: descobre ao voltar. Depende do
  provedor de e-mail que ainda falta.
- Não há prazo para a moderação responder. Uma contestação pode ficar em aberto indefinidamente, e
  nada além da ordem da fila pressiona por resposta.
