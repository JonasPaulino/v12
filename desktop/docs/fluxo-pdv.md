# Fluxo PDV Local

## Venda Normal

1. Operador abre caixa.
2. Operador adiciona produtos.
3. Operador informa pagamento.
4. Sistema grava venda local.
5. Se a venda for apenas orçamento ou venda simples, conclui localmente e sincroniza com o ERP.
6. Se o operador escolher NFC-e, o sistema tenta emitir o cupom fiscal antes de concluir a venda.
7. Se autorizada, conclui a venda, imprime o DANFCe e sincroniza com o ERP.
8. Se rejeitada, a venda não é concluída localmente.

## Contingencia

1. Sistema tenta emitir NFC-e online.
2. Se SEFAZ/internet falhar, mantém a venda em contingência local.
3. A venda segue concluída localmente, com pendência fiscal registrada.
4. Ao voltar a conexão, o operador pode reenviar as contingências pelo menu fiscal.
5. Quando a SEFAZ autoriza, o status fiscal é atualizado e sincronizado com o ERP.

## Caixa

- Caixa aberto permite venda.
- Fechamento gera resumo local e evento para sincronizacao.
- Sangria e suprimento devem gerar movimento de caixa.

## Regra Principal

Nunca depender da internet para registrar a venda. A venda nasce local, depois sincroniza.
