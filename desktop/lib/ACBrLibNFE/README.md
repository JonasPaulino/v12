## ACBrLib NFe no Desktop

Esta pasta pertence ao PDV desktop.

O servidor local do PDV procura a ACBrLib aqui por padrao, sem depender da estrutura do `web`.

Estrutura esperada:

- `desktop/lib/ACBrLibNFE/Windows/MT/Cdecl/ACBrNFe64.dll`
- `desktop/lib/ACBrLibNFE/dep/ACBrNFeServicos.ini`
- `desktop/lib/ACBrLibNFE/dep/Schemas/NFe/`

No Windows, a ACBrLibNFe tambem precisa das DLLs nativas de XML/OpenSSL. O runtime do PDV tenta localizar essas dependencias nas pastas:

- `desktop/lib/ACBrLibNFE/dep/LibXml2/x64`
- `desktop/lib/ACBrLibNFE/dep/OpenSSL/x64`
- `web/acbr/lib/ACBrLibMDFe/dep/LibXml2/x64`
- `web/acbr/lib/ACBrLibMDFe/dep/OpenSSL/x64`

Para uma instalacao desktop independente, copie as DLLs de `LibXml2/x64` e `OpenSSL/x64` para dentro de `desktop/lib/ACBrLibNFE/dep`.

Fallbacks aceitos no Windows:

- `desktop/lib/ACBrLibNFE/Windows/CONSOLE-MT/ACBrNFe64.dll`
- `desktop/lib/ACBrLibNFE/Windows/MT/StdCall/ACBrNFe64.dll`
- `desktop/lib/ACBrLibNFE/win64/ACBrNFe64.dll`

No Linux, se o PDV rodar fora do Windows, o caminho padrao esperado e:

- `desktop/lib/ACBrLibNFE/linux/CONSOLE-MT/libacbrnfe64.so`

Se quiser usar outro caminho, sobrescreva no `.env` do desktop:

- `V12_ACBRLIB_NFE_PATH`
- `V12_ACBRLIB_SCHEMA_PATH`
- `V12_ACBRLIB_NFE_SERVICOS_PATH`
