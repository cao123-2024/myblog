# LUMINA 博客系统启动脚本
# 双击运行即可

$host.UI.RawUI.WindowTitle = "LUMINA 液态玻璃博客"
Clear-Host

Write-Host ""
Write-Host "  LUMINA 博客系统 — 启动中..." -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  [错误] 未找到 Node.js，请先安装" -ForegroundColor Red
    Write-Host "  下载地址: https://nodejs.org"
    Read-Host "按回车退出"
    exit 1
}
Write-Host "  Node.js 版本: $(node -v)"

# 切换到脚本目录
Set-Location $PSScriptRoot

# 安装依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "  正在安装依赖包，请稍候..."
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [错误] 依赖安装失败" -ForegroundColor Red
        Read-Host "按回车退出"
        exit 1
    }
    Write-Host "  依赖安装完成"
}

# 释放端口 3000
$portProc = netstat -ano 2>$null | Select-String ":3000 " | Select-String "LISTENING"
if ($portProc) {
    Write-Host "  端口 3000 已被占用，正在释放..."
    $portProc | ForEach-Object {
        $pid = ($_ -split '\s+')[-1]
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "  端口已释放"
}

Write-Host ""
Write-Host "  正在启动服务器..." -ForegroundColor Green
Write-Host "  地址: http://localhost:3000"
Write-Host "  关闭本窗口即可停止服务器"
Write-Host ""

# 启动
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js"

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

Write-Host "  服务器已启动，浏览器即将打开..." -ForegroundColor Green
Write-Host "  按任意键停止服务器..."
Write-Host ""
$null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "  正在停止..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "  已停止"
Start-Sleep -Seconds 1
