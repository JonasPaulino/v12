# Política de release e atualização do V12 PDV

## Fluxo operacional

1. A V12 gera o instalador/pacote do PDV.
2. O Gestor Web cadastra o release em `Configurações > Releases PDV`.
3. O backend web salva o arquivo em `PDV_RELEASE_STORAGE_DIR`, calcula SHA-256 e publica metadados.
4. O PDV local consulta `/desktop/sync/releases/latest` usando `DESKTOP_SYNC_TOKEN`.
5. Se existir versão maior, o PDV baixa o arquivo, valida SHA-256 e registra em `release_update`.
6. A instalação é acionada explicitamente pelo PDV local. O sistema não troca binário no meio de uma venda.

## Versão do PDV

A versão oficial do PDV fica somente em `desktop/VERSION`.

Antes de empacotar, o script `npm run sync:version` copia essa versão para os `package.json` e para o `package-lock.json`, porque o `electron-builder` precisa ler a versão pelo manifest do Node.

O comando `npm run package:win` já executa essa sincronização automaticamente.

## Variáveis do web

- `PDV_RELEASE_STORAGE_DIR`: pasta onde o backend web armazena instaladores/pacotes.
- `PDV_RELEASE_MAX_FILE_SIZE`: limite de upload do release.

## Variáveis do desktop

- `V12_PDV_VERSION`: override técnico opcional. A fonte oficial é `desktop/VERSION`.
- `V12_PDV_RELEASE_CHANNEL`: canal consumido pelo terminal, por padrão `stable`.
- `V12_PDV_RELEASE_PLATFORM`: plataforma consumida, por padrão `win32-x64`.
- `V12_PDV_RELEASE_DIR`: pasta local onde o PDV baixa releases.

## Instalador

O script preparado é:

```bash
npm run package:win
```

Esse script executa o build da estação e chama `electron-builder` com `electron-builder.yml`.
Ele não foi executado durante esta implantação.

## Regra importante

O PDV empacotado inicia o servidor local usando o próprio Electron em modo Node
(`ELECTRON_RUN_AS_NODE=1`) e grava dados runtime em `app.getPath("userData")`,
não na pasta de instalação. Isso evita erro de permissão no Windows.
