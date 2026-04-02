# PowerShell script to check ports

Write-Host "🔍 Checking server ports..." -ForegroundColor Cyan
Write-Host ""

# Check port 3000
Write-Host "Port 3000 (should be Next.js web app):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Running" -ForegroundColor Green
} catch {
    Write-Host "❌ Not running" -ForegroundColor Red
}

Write-Host ""

# Check port 3001  
Write-Host "Port 3001 (should be Express backend):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Running" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 To fix port conflicts:" -ForegroundColor Cyan
Write-Host "1. Stop any process on port 3001:"
Write-Host "   Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process"
Write-Host "2. Start backend: cd server; npm run dev"
Write-Host "3. Start frontend: cd web; npm run dev"
