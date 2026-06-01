@echo off
title LUMINA - 液态玻璃博客
cd /d "%~dp0"

echo.
echo   ============================================
echo     LUMINA 博客系统 — 本地模式
echo   ============================================
echo.
echo   [1/3] 检查 Node.js...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [错误] 未找到 Node.js，请先安装
    echo   下载: https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo   Node.js 版本: %NODE_VER%

echo.
echo   [2/3] 检查必要目录...

if not exist "uploads" mkdir "uploads"
if not exist "database\data" mkdir "database\data"
if not exist "node_modules" (
    echo   正在安装依赖包...
    call npm install
    if %errorlevel% neq 0 (
        echo   [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo   [3/3] 释放端口并启动...
echo.

netstat -ano 2>nul | findstr ":3000.*LISTENING" >nul
if %errorlevel% equ 0 (
    echo   端口 3000 已被占用，正在释放...
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo.
echo   ============================================
echo    服务器启动中...
echo    地址: http://localhost:3000
echo    按 Ctrl+C 可停止服务器
echo   ============================================
echo.

start http://localhost:3000

"C:\Program Files\nodejs\node.exe" server.js

echo.
echo   ============================================
echo    服务器已停止
echo   ============================================
pause
