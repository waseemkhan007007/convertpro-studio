$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) {
    py -3.12 -m venv .venv
}

. .\.venv\Scripts\Activate.ps1

if (-not (Test-Path "..\.env")) {
    Copy-Item "..\.env.example" "..\.env" -ErrorAction SilentlyContinue
}

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

Write-Host "Starting ConvertPro Studio backend..."
uvicorn app.main:app --reload --port 8000
