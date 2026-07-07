# Novara SMS - Full System Startup Script
# Run this from the SMS root folder: .\start.ps1

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND = Join-Path $ROOT "smart_school_backend"
$FRONTEND = Join-Path $ROOT "frontend\admin-web"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   NOVARA SMS - Starting Full System      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check backend venv exists
if (-Not (Test-Path "$BACKEND\.venv\Scripts\uvicorn.exe")) {
    Write-Host "[ERROR] Backend virtual environment not found." -ForegroundColor Red
    Write-Host "Run this first in the smart_school_backend folder:" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv" -ForegroundColor White
    Write-Host "  .venv\Scripts\activate" -ForegroundColor White
    Write-Host "  pip install -r requirements.txt" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check frontend node_modules exists
if (-Not (Test-Path "$FRONTEND\node_modules")) {
    Write-Host "[ERROR] Frontend dependencies not installed." -ForegroundColor Red
    Write-Host "Run this first in the frontend\admin-web folder:" -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/2] Starting Backend API on http://0.0.0.0:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$BACKEND'; Write-Host 'NOVARA BACKEND' -ForegroundColor Cyan; .venv\Scripts\uvicorn.exe app.main:app --reload --host 0.0.0.0 --port 8000"
) -WindowStyle Normal

# Small delay so backend starts first
Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Frontend UI on http://0.0.0.0:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$FRONTEND'; Write-Host 'NOVARA FRONTEND' -ForegroundColor Cyan; npm run dev"
) -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   System is starting up...               " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend  ->  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend   ->  http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs  ->  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""

# Get local network IP for remote access
$IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -notlike "*Loopback*" -and
    $_.InterfaceAlias -notlike "*WSL*" -and
    $_.IPAddress -notlike "169.*"
} | Select-Object -First 1).IPAddress

if ($IP) {
    Write-Host "  Remote PC ->  http://${IP}:5173" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "  Login     ->  mwesigwaperez98@gmail.com" -ForegroundColor Green
Write-Host "  Password  ->  novara2026" -ForegroundColor Green
Write-Host ""
Write-Host "  Two windows opened. Close them to stop the system." -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to close this window"
