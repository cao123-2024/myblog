@echo off
set "PATH=C:\Windows\System32;C:\Windows;C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

set NODE_EXE=
if exist "C:\Program Files\nodejs\node.exe" set NODE_EXE=C:\Program Files\nodejs\node.exe
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe
if "%NODE_EXE%"=="" (
    echo Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

"%NODE_EXE%" "scripts\start.js"
pause
