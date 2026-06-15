# v12/acbr

Servico fiscal isolado do ERP `v12`, pensado para concentrar a integracao com o ACBr na emissao de NF-e modelo 55.

## Objetivo

- manter a automacao fiscal separada do backend principal
- usar o mesmo banco `database_v12`, mas com schema dedicado `fiscal`
- preparar o fluxo de:
  - geracao de NF-e a partir de `pedido_venda`
  - importacao de XML
  - consulta de status
  - cancelamento

## Estrutura

- `index.js`: bootstrap do servidor
- `config/`: conexao com banco e CORS
- `middleware/`: autenticacao por cookie JWT e contexto de tenant
- `model/`: acesso ao schema `fiscal`
- `routes/`: endpoints REST da NF-e
- `providers/acbrlib/`: ponto de integracao com ACBrLib
- `migrations/`: criacao do schema fiscal

## Endpoints iniciais

- `GET /healthz`
- `GET /nfe/listar`
- `GET /nfe/support-data`
- `GET /nfe/pedidos-select`
- `GET /nfe/:id`
- `POST /nfe/emitir`
- `POST /nfe/importar-xml`
- `POST /nfe/:id/processar`
- `POST /nfe/:id/consultar-status`
- `POST /nfe/:id/cancelar`

## Estado atual

O schema fiscal ja e criado e o servico ja registra:

- rascunho de NF-e por pedido
- snapshot de itens
- eventos
- XML importado

A chamada real para ACBrLib ainda esta como stub em `providers/acbrlib/client.js`.
