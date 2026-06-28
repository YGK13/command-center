@echo off
REM ============================================================
REM  Command Center - desktop app launcher
REM  Double-click this (or the desktop shortcut) to open the
REM  dashboard. Your edits auto-save to disk and feed the 6 AM
REM  email. A minimized "node" window is the server; close it to
REM  stop the app.
REM ============================================================
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "setup\launch.ps1"
