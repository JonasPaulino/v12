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

  StrCpy $INSTDIR "$R0"

  SetRegView 64
  DeleteRegKey HKLM "${INSTALL_REGISTRY_KEY}"
  DeleteRegKey HKCU "${INSTALL_REGISTRY_KEY}"

  SetRegView 32
  DeleteRegKey HKLM "${INSTALL_REGISTRY_KEY}"
  DeleteRegKey HKCU "${INSTALL_REGISTRY_KEY}"
!macroend

!macro customInit
  nsExec::ExecToLog 'taskkill /IM "V12 PDV.exe" /F'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'taskkill /IM "V12 PDV.exe" /F'

  RMDir /r "$INSTDIR"
!macroend
