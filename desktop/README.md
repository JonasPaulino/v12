# V12 Desktop

O `desktop/` concentra o futuro V12 PDV/local. Ele e separado do ERP web para permitir venda local, NFC-e modelo 65, contingencia offline e sincronizacao posterior.

## Estrutura

- `apps/server`: servidor local da loja, banco SQLite, filas de sincronizacao, caixa, vendas e integracao fiscal.
- `apps/station`: app Electron/React usado em cada caixa/estacao.
- `packages/shared`: constantes e contratos compartilhados entre servidor e estacao.
- `docs`: decisoes de arquitetura e fluxos operacionais.

## Fluxo Alvo

O ERP web continua sendo a fonte principal de cadastro e gestao. O desktop trabalha offline primeiro, grava tudo localmente e sincroniza quando houver internet.

```text
V12 ERP Web <-> Sync API <-> V12 Server Local <-> Estacoes Electron
                                  |
                                  +-> SQLite
                                  +-> ACBr Monitor/Lib
                                  +-> Impressora / certificado / NFC-e
```

## Como Evoluir

1. Subir `apps/server` com SQLite e rotas locais.
2. Criar estacao Electron consumindo o servidor local.
3. Implementar venda/caixa offline.
4. Integrar NFC-e modelo 65 via ACBrMonitor ou ACBrLib.
5. Criar sincronizacao real com o ERP web.

Nao instale dependencias nem rode build na VPS do web; este modulo e para ambiente local/desktop.

## Desenvolvimento Local

A versão oficial do PDV fica em `VERSION`. Para gerar uma nova release, altere somente esse arquivo e rode:

```bash
npm run package:win
```

O build sincroniza automaticamente os manifests antes de chamar o `electron-builder`.

Depois de instalar dependencias no ambiente de desenvolvimento desktop:

```bash
cd desktop
npm install
npm run dev:server
```

Em outro terminal:

```bash
cd desktop
npm run dev:station
```

Em outro terminal, com o Vite aberto:

```bash
cd desktop
npm --workspace @v12-desktop/station run dev:electron
```

O servidor local expõe a API em `http://127.0.0.1:5100/api/local`.

## Setup e Sincronizacao

Configure no `.env` do desktop:

```bash
V12_ERP_API_URL=https://v12.jhes.com.br/api
V12_ERP_SYNC_TOKEN=mesmo-token-do-DESKTOP_SYNC_TOKEN-do-ERP
```

Configure no `.env` do ERP web:

```bash
DESKTOP_SYNC_TOKEN=token-forte-para-pdv-local
```

No primeiro acesso, o PDV faz login no ERP web, seleciona a filial real e grava o mesmo `tenant_id` no SQLite local. Depois disso, use o login local com os operadores sincronizados. Usuários master não são baixados para o PDV.

No PDV, use `Menu > Sincronizar produtos` para recarregar produtos/precos/estoque do ERP para o SQLite local.
