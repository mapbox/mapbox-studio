; Mapbox Studio nsis installer script

; HM NIS Edit Wizard helper defines
!define PRODUCT_DIR "mapbox-studio"
!define PRODUCT_NAME "Mapbox Studio"
!define PRODUCT_PUBLISHER "Mapbox"
!define PRODUCT_WEB_SITE "https://www.mapbox.com/"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_DIR}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"
!define PRODUCT_STARTMENU_REGVAL "NSIS:StartMenuDir"

; firewall extras
!addplugindir "..\vendor\nsisFirewall-1.2\bin"
!include "FileFunc.nsh"

RequestExecutionLevel admin

; MUI 1.67 compatible ------
!include "MUI.nsh"

; MUI Settings
!define MUI_ABORTWARNING
!define MUI_ICON "assets\mapbox-studio.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Welcome page
!insertmacro MUI_PAGE_WELCOME
; Directory page
!insertmacro MUI_PAGE_DIRECTORY
; Start menu page
var ICONS_GROUP
!define MUI_STARTMENUPAGE_NODISABLE
!define MUI_STARTMENUPAGE_DEFAULTFOLDER "${PRODUCT_DIR}"
!define MUI_STARTMENUPAGE_REGISTRY_ROOT "${PRODUCT_UNINST_ROOT_KEY}"
!define MUI_STARTMENUPAGE_REGISTRY_KEY "${PRODUCT_UNINST_KEY}"
!define MUI_STARTMENUPAGE_REGISTRY_VALUENAME "${PRODUCT_STARTMENU_REGVAL}"
!insertmacro MUI_PAGE_STARTMENU Application $ICONS_GROUP
; Instfiles page
!insertmacro MUI_PAGE_INSTFILES
; Finish page
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
#insertmacro MUI_UNPAGE_INSTFILES

; Language files
!insertmacro MUI_LANGUAGE "English"

; MUI end ------

Name "${PRODUCT_DIR}"
OutFile "..\..\..\..\${PRODUCT_DIR}.exe"
InstallDir "$PROGRAMFILES\${PRODUCT_DIR}"


Section "MainSection" SEC01
  SetOverwrite try
  SetOutPath "$INSTDIR"
  File /r ..\..\..\*.*
SectionEnd

; Add firewall rule
Section "Add Windows Firewall Rule"
    ; Add TileMill to the authorized list
    nsisFirewall::AddAuthorizedApplication "$INSTDIR\resources\app\vendor\node.exe" "Evented I/O for V8 JavaScript"
    Pop $0
    IntCmp $0 0 +3
        MessageBox MB_OK "Notice: unable to add node.exe (used by Mapbox Studio) to the Firewall exception list. This means that you will likely need to allow node.exe access to the firewall upon first run (code=$0)" /SD IDOK
        Return
SectionEnd

Section -AdditionalIcons
  SetShellVarContext all
  SetOutPath $INSTDIR
  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
  CreateDirectory "$SMPROGRAMS\$ICONS_GROUP"
  CreateShortCut "$SMPROGRAMS\$ICONS_GROUP\${PRODUCT_NAME}.lnk" "$INSTDIR\atom.exe" "" "$INSTDIR\resources\app\scripts\assets\mapbox-studio.ico"
  CreateShortCut "$SMPROGRAMS\$ICONS_GROUP\Uninstall ${PRODUCT_NAME}.lnk" "$INSTDIR\uninstall.exe"
  !insertmacro MUI_STARTMENU_WRITE_END
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd


Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "$(^Name) was successfully removed from your computer." /SD IDOK
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Are you sure you want to completely remove $(^Name) and all of its components?" /SD IDYES IDYES +2
  Abort
FunctionEnd

Section Uninstall
   SetShellVarContext all
   ; Remove Node.js from the authorized list
   nsisFirewall::RemoveAuthorizedApplication "$INSTDIR\resources\app\vendor\node.exe"
   Pop $0
   IntCmp $0 0 +3
       MessageBox MB_OK "A problem happened while removing node.exe (used by Mapbox Studio) from the Firewall exception list (result=$0)" /SD IDOK
       Return

  Delete "$INSTDIR\*.*"
  RMDir /r "$INSTDIR\*.*"
  RMDir "$INSTDIR"
  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
  !insertmacro MUI_STARTMENU_GETFOLDER "Application" $ICONS_GROUP
  Delete "$SMPROGRAMS\$ICONS_GROUP\Uninstall ${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\$ICONS_GROUP\${PRODUCT_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\$ICONS_GROUP"
  !insertmacro MUI_STARTMENU_WRITE_END
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  SetAutoClose true
SectionEnd
