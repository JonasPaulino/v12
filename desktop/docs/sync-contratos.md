# Contratos de Sincronizacao

## Eventos Locais

- `CAIXA_ABERTO`
- `CAIXA_FECHADO`
- `VENDA_CRIADA`
- `NFCE_EMITIDA`
- `NFCE_CONTINGENCIA`
- `NFCE_AUTORIZADA`
- `NFCE_CANCELADA`
- `NFCE_REJEITADA`
- `PESSOA_CRIADA`
- `PRODUTO_ATUALIZADO`

## Status da Fila

- `pendente`
- `processando`
- `sucesso`
- `erro`

## Estrategia

Cada evento salvo em `sync_queue` deve ter payload suficiente para o ERP reproduzir o movimento sem consultar outras tabelas locais.
