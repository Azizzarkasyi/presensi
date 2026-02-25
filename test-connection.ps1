# Script untuk test koneksi ke Cloudflare backend

Write-Host "=== Testing Cloudflare Backend Connection ===" -ForegroundColor Green

$baseUrl = "https://api-presensi.yexsx.my.id/api"

# Test 1: Health Check
Write-Host "`n[1/3] Testing Health Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method Get
    Write-Host "✓ Backend is running!" -ForegroundColor Green
    Write-Host "  Message: $($response.message)" -ForegroundColor White
    Write-Host "  Version: $($response.version)" -ForegroundColor White
} catch {
    Write-Host "✗ Health check failed!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Login Endpoint
Write-Host "`n[2/3] Testing Login Endpoint..." -ForegroundColor Cyan
try {
    $body = @{
        email = "admin@demo.com"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/auto-login" -Method Post -Body $body -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✓ Login successful!" -ForegroundColor Green
        Write-Host "  User: $($response.data.user.name)" -ForegroundColor White
        Write-Host "  Role: $($response.data.user.role)" -ForegroundColor White
        Write-Host "  Tenant: $($response.data.tenant.name)" -ForegroundColor White
    } else {
        Write-Host "✗ Login failed!" -ForegroundColor Red
        Write-Host "  Message: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Login test failed!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: CORS Check
Write-Host "`n[3/3] Checking CORS Configuration..." -ForegroundColor Cyan
try {
    $headers = @{
        "Origin" = "http://localhost:8081"
    }
    $response = Invoke-WebRequest -Uri $baseUrl -Method Options -Headers $headers -UseBasicParsing
    
    if ($response.Headers["Access-Control-Allow-Origin"]) {
        Write-Host "✓ CORS is configured!" -ForegroundColor Green
    } else {
        Write-Host "⚠ CORS headers not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not verify CORS" -ForegroundColor Yellow
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
Write-Host "`nJika semua test berhasil, mobile app seharusnya bisa connect." -ForegroundColor Cyan
Write-Host "Jika ada error, lihat TROUBLESHOOTING.md untuk solusi." -ForegroundColor Yellow
