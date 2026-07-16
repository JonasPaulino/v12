@echo off
setlocal
set "SCRIPT=%~dp0tools\restore-pdv.mjs"
where node >nul 2>nul
if %errorlevel% equ 0 (
  node "%SCRIPT%"
  pause
  exit /b %errorlevel%
)
echo Node.js nao encontrado para executar a restauracao.
echo Se estiver usando o instalador final, execute o restaurador fornecido junto ao V12 PDV.
pause
exit /b 1
