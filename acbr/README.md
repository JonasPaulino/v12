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

O schema fiscal ja e criado e o servico registra:

- rascunho de NF-e por pedido
- snapshot de itens
- eventos de integracao
- XMLs gerados pela emissao
- XML importado

O provider da ACBrLib fica isolado em `providers/acbrlib/` e usa:

- `@projetoacbr/acbrlib-nfe-node` como ponte oficial para a biblioteca nativa
- `model/acbrNfeIntegrationDAO.js` para persistencia da integracao
- `providers/acbrlib/iniBuilder.js` para gerar o INI da NF-e

## Requisitos para emissao

- `ACBRLIB_ENABLED=true`
- `ACBRLIB_PATH` apontando para a `libacbrnfe64.so`
- em ambiente Node/Linux prefira a variante `mt` da biblioteca
- schemas XML copiados para `resources/schemas/` ou outro caminho em `ACBRLIB_SCHEMA_PATH`
- certificado A1 configurado na filial
- emitente completo na configuracao

## Instalacao recomendada da lib

- copiar a biblioteca para `acbr/lib/linux/libacbrnfe64.so`
- se o pacote vier separado em `mt/` e `st/`, usar a `mt`
