@echo off
title LUMINA
cd /d "%~dp0"
echo Starting LUMINA...
echo.
C:\Windows\System32\taskkill.exe /F /IM node.exe >nul 2>&1
C:\Windows\System32\ping.exe 127.0.0.1 -n 2 >nul
"C:\Program Files\nodejs\node.exe" server.js
C:\Windows\System32\ping.exe 127.0.0.1 -n 2 >nul
