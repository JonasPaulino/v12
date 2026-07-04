# Fluxo PDV Local

## Venda Normal

1. Operador abre caixa.
2. Operador adiciona produtos.
3. Operador informa pagamento.
4. Sistema grava venda local.
5. Sistema tenta emitir NFC-e.
6. Se autorizada, imprime DANFE NFC-e.
7. Sistema adiciona venda e XML na fila de sincronizacao.

## Contingencia

1. Sistema tenta emitir NFC-e online.
2. Se SEFAZ/internet falhar, registra contingencia offline.
3. Imprime cupom em contingencia.
4. Mantem XML pendente.
5. Ao voltar a conexao, transmite pendencias.
6. Atualiza status local e sincroniza com ERP.

## Caixa

- Caixa aberto permite venda.
- Fechamento gera resumo local e evento para sincronizacao.
- Sangria e suprimento devem gerar movimento de caixa.

## Regra Principal

Nunca depender da internet para registrar a venda. A venda nasce local, depois sincroniza.
