!include "LogicLib.nsh"

!macro customInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Install optional Offline Auto Subtitles module?" IDYES +2
  RMDir /r "$INSTDIR\resources\optional\offline-subtitles"
!macroend
