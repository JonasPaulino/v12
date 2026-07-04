# V12 ERP

## Estrutura

- `web/`: aplicação web do ERP e seus serviços atuais (`front`, `back`, `acbr`, `payments`, `message`, `reports`).
- `desktop/`: área reservada para o futuro V12 PDV/Servidor Local/Estações.
- `web/docker-compose.yml`: compose da aplicação web.
- `deploy.sh`: wrapper mantido na raiz para preservar o comando atual e delegar para `web/deploy.sh`.
