# Script untuk menjalankan Backend dan Frontend

Write-Host "=== Starting Presensi Application ===" -ForegroundColor Green

# Start Backend dengan PM2
Write-Host "`n[1/2] Starting Backend Server dengan PM2..." -ForegroundColor Cyan
Set-Location "c:\cloudfire\project\presensi\absensi"
pm2 start ecosystem.config.js
pm2 list

# Informasi untuk Frontend
Write-Host "`n[2/2] Untuk menjalankan Mobile App:" -ForegroundColor Cyan
Write-Host "  Buka terminal baru dan jalankan:" -ForegroundColor Yellow
Write-Host "  cd c:\cloudfire\project\presensi\mobile" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "Backend: Running di http://localhost:3000" -ForegroundColor Green
Write-Host "Frontend: Jalankan 'npm start' di folder mobile" -ForegroundColor Yellow

Write-Host "`nPM2 Commands:" -ForegroundColor Cyan
Write-Host "  pm2 list          - Lihat status" -ForegroundColor White
Write-Host "  pm2 logs          - Lihat logs" -ForegroundColor White
Write-Host "  pm2 stop all      - Stop semua" -ForegroundColor White
Write-Host "  pm2 restart all   - Restart semua" -ForegroundColor White
