## ACBrLib NFe no Desktop

Esta pasta pertence ao PDV desktop.

O servidor local do PDV procura a ACBrLib aqui por padrao, sem depender da estrutura do `web`.

Estrutura esperada:

- `desktop/lib/ACBrLibNFE/win64/ACBrNFe64.dll`
- `desktop/lib/ACBrLibNFE/dep/ACBrNFeServicos.ini`
- `desktop/lib/ACBrLibNFE/dep/Schemas/NFe/`

No Linux, se o PDV rodar fora do Windows, o caminho padrao esperado e:

- `desktop/lib/ACBrLibNFE/linux/CONSOLE-MT/libacbrnfe64.so`

Se quiser usar outro caminho, sobrescreva no `.env` do desktop:

- `V12_ACBRLIB_NFE_PATH`
- `V12_ACBRLIB_SCHEMA_PATH`
- `V12_ACBRLIB_NFE_SERVICOS_PATH`
