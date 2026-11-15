$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backendScript = Join-Path $root "backend\run-dev.ps1"
$frontendScript = Join-Path $root "frontend\run-dev.ps1"
$frontendPort = 5173

while (Get-NetTCPConnection -LocalPort $frontendPort -State Listen -ErrorAction SilentlyContinue) {
    $frontendPort++
}

Start-Process powershell -ArgumentList "-NoExit", "-File", $backendScript
Start-Process powershell -ArgumentList "-NoExit", "-File", $frontendScript, "-Port", "$frontendPort"

Write-Host "Backend and frontend dev terminals launched."
Write-Host "On this PC, open http://localhost:$frontendPort"

$lanAddresses = Get-NetIPConfiguration |
    Where-Object { $_.NetAdapter.Status -eq "Up" } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Where-Object { $_ -and $_ -ne "127.0.0.1" -and $_ -notlike "169.254.*" } |
    Select-Object -Unique

if ($lanAddresses) {
    Write-Host "On an Android phone connected to the same private Wi-Fi, open:"
    foreach ($address in $lanAddresses) {
        Write-Host "  http://${address}:$frontendPort"
    }
    Write-Host "If Windows Firewall prompts, allow access on private networks only."
} else {
    Write-Host "No LAN IPv4 address found. Connect this PC and the phone to the same Wi-Fi."
}
