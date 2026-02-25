# Script untuk menjalankan Mobile App

Write-Host "=== Starting Mobile App ===" -ForegroundColor Green

Set-Location "c:\cloudfire\project\presensi\mobile"

Write-Host "`nMemulai Expo development server..." -ForegroundColor Cyan
Write-Host "Tekan 'a' untuk membuka di Android emulator" -ForegroundColor Yellow
Write-Host "Tekan 'i' untuk membuka di iOS simulator" -ForegroundColor Yellow
Write-Host "Scan QR code dengan Expo Go app di HP" -ForegroundColor Yellow

npm start
