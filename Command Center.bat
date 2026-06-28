@echo off
REM ============================================================
REM  Command Center - desktop app launcher
REM  Double-click this (or the desktop shortcut) to open the
REM  dashboard. Your edits auto-save to disk and feed the 6 AM
REM  email. Closing the small server window stops the app.
REM ============================================================
cd /d "%~dp0"

REM Start the local app server in a minimized window (localhost only).
start "Command Center server" /min cmd /c "node scripts\serve.mjs"

REM Give the server a second to come up.
ping -n 2 127.0.0.1 >nul

REM Open in a clean app window via Chrome if present, else the default browser.
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROMEX=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app=http://localhost:4173 --window-size=1440,900
) else if exist "%CHROMEX%" (
  start "" "%CHROMEX%" --app=http://localhost:4173 --window-size=1440,900
) else (
  start "" http://localhost:4173
)
