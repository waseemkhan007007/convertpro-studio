param(
    [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host "Starting ConvertPro Studio frontend..."
npm run dev -- --host 0.0.0.0 --port $Port --strictPort
