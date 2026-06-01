# LUMINA 博客系统启动脚本
# 双击运行即可（推荐右键 → 使用PowerShell运行）

$host.UI.RawUI.WindowTitle = "LUMINA 液态玻璃博客"
Clear-Host

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    LUMINA 博客系统 — 本地模式" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  [错误] 未找到 Node.js，请先安装" -ForegroundColor Red
    Write-Host "  下载地址: https://nodejs.org"
    Read-Host "按回车退出"
    exit 1
}
Write-Host "  [1/3] Node.js 版本: $(node -v)" -ForegroundColor Green

# 切换到脚本目录
Set-Location $PSScriptRoot

# 创建必要目录
if (-not (Test-Path "uploads")) {
    New-Item -ItemType Directory -Path "uploads" -Force | Out-Null
    Write-Host "  已创建 uploads/ 目录"
}
if (-not (Test-Path "database\data")) {
    New-Item -ItemType Directory -Path "database\data" -Force | Out-Null
    Write-Host "  已创建 database/data/ 目录"
}

# 安装依赖
Write-Host ""
Write-Host "  [2/3] 检查依赖包..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  正在安装依赖包，请稍候..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [错误] 依赖安装失败" -ForegroundColor Red
        Read-Host "按回车退出"
        exit 1
    }
    Write-Host "  依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "  依赖已就绪" -ForegroundColor Green
}

# 释放端口 3000
Write-Host ""
Write-Host "  [3/3] 检查端口..." -ForegroundColor Yellow
$portProc = netstat -ano 2>$null | Select-String ":3000 " | Select-String "LISTENING"
if ($portProc) {
    Write-Host "  端口 3000 已被占用，正在释放..."
    $portProc | ForEach-Object {
        $pidStr = ($_ -split '\s+')[-1]
        try {
            $proc = Get-Process -Id ([int]$pidStr) -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -eq "node") {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Write-Host "  已停止进程 PID: $($proc.Id)"
            }
        } catch {}
    }
    Start-Sleep -Seconds 2
    Write-Host "  端口已释放" -ForegroundColor Green
}

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   服务器启动中..." -ForegroundColor Green
Write-Host "   地址: http://localhost:3000" -ForegroundColor White
Write-Host "   按 Ctrl+C 可停止服务器" -ForegroundColor DarkGray
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# 启动 — 直接在当前窗口运行，这样 Ctrl+C 可以停止
Start-Process "http://localhost:3000"

try {
    node server.js
} catch {
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Red
    Write-Host "   服务器错误: $_" -ForegroundColor Red
    Write-Host "  ============================================" -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host "   服务器已停止" -ForegroundColor DarkGray
Write-Host "   按任意键关闭此窗口..." -ForegroundColor DarkGray
Write-Host "  ============================================" -ForegroundColor DarkGray
$null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
