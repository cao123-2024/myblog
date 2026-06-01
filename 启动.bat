@echo off
set "PATH=C:\Windows\System32;C:\Program Files\nodejs;%PATH%"
title LUMINA Blog
cd /d "%~dp0"

echo.
echo   ============================================
echo     LUMINA Blog - Local Mode
echo   ============================================
echo.
echo   [1/3] Prepare directories...

if not exist "uploads" mkdir "uploads"
if not exist "database\data" mkdir "database\data"
if not exist "node_modules" (
    echo   Installing dependencies...
    C:\Windows\System32\cmd.exe /c "cd /d "%~dp0" && "C:\Program Files\nodejs\npm.cmd" install"
)

echo.
echo   [2/3] Free port 3000...

for /f "tokens=5" %%a in ('C:\Windows\System32\netstat.exe -ano 2^>nul ^| C:\Windows\System32\findstr.exe ":3000.*LISTENING"') do (
    C:\Windows\System32\taskkill.exe /PID %%a /F >nul 2>&1
)

echo.
echo   [3/3] Starting server...
echo.
echo   ============================================
echo     URL: http://localhost:3000
echo     Press Ctrl+C to stop
echo   ============================================
echo.

start http://localhost:3000

"C:\Program Files\nodejs\node.exe" server.js

echo.
echo   ============================================
echo     Server stopped.
echo   ============================================
pause
