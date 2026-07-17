!macro preInit
  StrCpy $R0 ""

  SetRegView 64
  ReadRegStr $R0 HKLM "${INSTALL_REGISTRY_KEY}" "InstallLocation"
  StrCmp $R0 "" 0 +2
  ReadRegStr $R0 HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation"

  SetRegView 32
  StrCmp $R0 "" 0 +2
  ReadRegStr $R0 HKLM "${INSTALL_REGISTRY_KEY}" "InstallLocation"
  StrCmp $R0 "" 0 +2
  ReadRegStr $R0 HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation"

  StrCmp $R0 "" 0 +2
  StrCpy $R0 "C:\v12\V12 PDV"

  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$R0"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$R0"

  SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$R0"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$R0"
!macroend

!macro customInit
  nsExec::ExecToLog 'taskkill /IM "V12 PDV.exe" /F'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'taskkill /IM "V12 PDV.exe" /F'

  MessageBox MB_YESNO|MB_ICONQUESTION "Deseja remover tambem os dados locais do V12 PDV?$\r$\n$\r$\nIsso apaga configuracao do terminal, banco SQLite, logs, cache, releases baixados e arquivos fiscais locais. Use esta opcao somente para reinstalacao limpa ou ambiente de teste." IDYES removeV12PdvUserData IDNO keepV12PdvUserData

  Goto keepV12PdvUserData

removeV12PdvUserData:
  SetShellVarContext current
  RMDir /r "$APPDATA\v12-desktop"
  RMDir /r "$LOCALAPPDATA\v12-desktop"
  RMDir /r "$APPDATA\V12 PDV"
  RMDir /r "$LOCALAPPDATA\V12 PDV"
  SetShellVarContext all

keepV12PdvUserData:
  RMDir /r "$INSTDIR"
!macroend
