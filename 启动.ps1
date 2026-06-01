# LUMINA 博客 — 启动脚本
param()

$host.UI.RawUI.WindowTitle = "LUMINA"

$nodePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)

$nodeExe = $null
foreach ($p in $nodePaths) {
    if (Test-Path $p) { $nodeExe = $p; break }
}

if (-not $nodeExe) {
    Write-Host "Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $PSScriptRoot
& $nodeExe "scripts\start.js"
Read-Host
