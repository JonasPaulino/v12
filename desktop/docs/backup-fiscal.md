# Backup fiscal do PDV

## Objetivo

Guardar os arquivos fiscais do PDV local fora da maquina do cliente, com controle incremental e registro local de auditoria.

O XML fiscal deve ser tratado como documento principal. O banco local guarda metadados e cache operacional, mas a politica de backup deve proteger os arquivos XML fisicos e o SQLite do PDV.

## Responsabilidades

- O PDV local coleta XMLs, gera snapshot do SQLite, calcula hashes e compacta em `.7z`.
- O PDV local envia o pacote para a retaguarda V12 usando o token de sincronizacao desktop.
- A retaguarda V12 valida tenant, terminal, hash e duplicidade.
- A retaguarda V12 faz o upload para o Google Drive.
- A credencial do Google Drive fica somente no web/gestor, nunca no computador do cliente.

## Autenticacao no Google Drive

Nao use API key para upload de backup privado. API key identifica o projeto, mas nao concede permissao para gravar arquivos privados no Drive.

Use uma conta de servico do Google Cloud configurada no gestor/web:

1. Ative a Google Drive API no projeto.
2. Crie uma conta de servico.
3. Gere a chave JSON.
4. Compartilhe a pasta de destino do Google Drive com o e-mail da conta de servico.
5. Configure a pasta e a credencial no ambiente Gestão V12.

Se alguma API key foi exposta em conversa, ticket, commit ou print, rotacione a chave no Google Cloud.

## Variaveis

```env
V12_BACKUP_ENABLED=true
V12_BACKUP_AUTO_INTERVAL_MINUTES=120
V12_BACKUP_DIR=./data/backups
V12_BACKUP_7Z_PATH=7z
V12_BACKUP_LOCAL_RETENTION_DAYS=30
```

## Como funciona

- O PDV faz snapshot consistente do SQLite.
- O PDV varre os XMLs gerados pela ACBrLib em `V12_ACBRLIB_TEMP_DIR`.
- Cada arquivo recebe SHA-256.
- Arquivos ja enviados com o mesmo hash nao entram no proximo pacote.
- O pacote e compactado em `.7z`.
- O upload do pacote e feito para a retaguarda V12.
- A retaguarda V12 faz o upload para o Google Drive.
- As tabelas `backup_execucao` e `backup_item` registram historico, hashes e arquivo enviado.

## Rotas locais

```http
GET  /api/local/backup/status
POST /api/local/backup/executar
```

## Rotas da retaguarda

```http
POST /desktop/sync/backups
GET  /gestao/backup/google-drive/configuracao
PUT  /gestao/backup/google-drive/configuracao
```

O agendador automatico so inicia quando `V12_BACKUP_ENABLED=true` e `V12_BACKUP_AUTO_INTERVAL_MINUTES` for maior que zero.
