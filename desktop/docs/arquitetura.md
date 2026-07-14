# Arquitetura V12 Desktop

## Objetivo

Criar um PDV local que continue vendendo sem internet e envie os movimentos para o V12 ERP quando a conexao voltar.

## Decisoes

- O ERP web e o sistema principal.
- O desktop nao depende da internet para registrar venda.
- Toda operacao local gera evento em `sync_queue`.
- A emissao fiscal local deve ser isolada em um adaptador ACBr.
- A estacao Electron nao acessa diretamente o banco; ela conversa com o servidor local.

## Componentes

- `server local`: API HTTP local, SQLite, sync, fiscal e regras de caixa.
- `station`: interface do caixa.
- `shared`: contratos e status padronizados.

## Banco Local

SQLite foi escolhido porque nao exige instalacao de servidor no cliente e funciona bem para PDV local.

## Sincronizacao

O servidor local recebe cadastros do ERP:

- produtos
- pessoas/clientes
- usuarios
- formas de pagamento
- regras fiscais
- configuracoes da filial

O servidor local envia movimentos para o ERP:

- vendas
- itens
- pagamentos
- abertura/fechamento de caixa
- NFC-e autorizada/contingencia/rejeitada/cancelada
- cancelamentos
- eventos de erro

## Fiscal

O PDV usa ACBrLib para emissao local da NFC-e. O adaptador fiscal continua isolado para permitir evolucoes futuras sem acoplar a interface do caixa a detalhes da biblioteca.
