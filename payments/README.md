# v12/payments

Serviço de cobranças e webhooks bancários do ERP `v12`.

## Objetivo

- isolar integrações financeiras do backend principal
- manter o ERP dono das regras financeiras
- usar schema próprio `payments` para vínculos externos
- começar com Asaas em sandbox e permitir expansão futura para outros providers

## Fluxo inicial

- `back` solicita uma cobrança PIX para um `financeiro_titulo`
- este serviço cria ou reaproveita o cliente no Asaas
- este serviço cria a cobrança PIX e devolve QR Code + payload
- o Asaas chama o webhook deste serviço quando o pagamento ocorrer
- este serviço notifica o backend principal para registrar a baixa automática

## Endpoints

- `GET /healthz`
- `POST /internal/charges/pix`
- `POST /webhooks/asaas`

## Setup mínimo

1. Rodar as migrations principais do `back`.
2. Rodar a migration `v12/payments/migrations/001_payments_schema.sql`.
3. Configurar `v12/back/.env`:
   - `PAYMENTS_SERVICE_URL=http://localhost:4200`
   - `PAYMENTS_SERVICE_TOKEN=seu_token_interno`
4. Configurar `v12/payments/.env`:
   - `SERVICE_TOKEN=seu_token_interno`
   - `BACKEND_URL=http://localhost:4000`
   - `BACKEND_SERVICE_TOKEN=seu_token_interno`
   - `CHAVE_TOKEN` igual à do backend principal
5. Subir o serviço com `npm start`.
6. No Asaas, apontar o webhook para:
   - `POST /webhooks/asaas`
7. Na tela `Configurações > Contas`, preencher:
   - ambiente
   - API Key
   - token de autenticação do webhook
   - ativar integração e baixa automática PIX se desejar
