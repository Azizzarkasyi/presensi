# Troubleshooting Cloudflare Connection

## Masalah yang Sudah Diperbaiki
✅ Mobile app API URL sudah diubah ke Cloudflare URL

## Checklist Koneksi Cloudflare

### 1. Verifikasi Backend Berjalan
```powershell
pm2 list
# Pastikan absensi-server status: online
```

### 2. Test Backend Langsung
Buka browser dan akses:
```
https://api-presensi.yexsx.my.id/api
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Multi-Tenant Attendance API is running",
  "version": "2.0.0"
}
```

### 3. Test Login Endpoint
Gunakan Postman atau curl:
```bash
curl -X POST https://api-presensi.yexsx.my.id/api/auth/auto-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}'
```

### 4. Cek Cloudflare Tunnel Status
```powershell
# Jika menggunakan cloudflared
cloudflared tunnel list
cloudflared tunnel info <tunnel-name>
```

## Kemungkinan Masalah

### A. Cloudflare Tunnel Tidak Berjalan
**Solusi:**
```powershell
# Start tunnel
cloudflared tunnel run <tunnel-name>

# Atau dengan config file
cloudflared tunnel --config path/to/config.yml run
```

### B. CORS Error di Mobile App
**Gejala:** Error "CORS policy" atau "Network Error"

**Solusi:** Backend sudah dikonfigurasi dengan `origin: true` di `src/app.ts`, tapi pastikan:
1. Cloudflare tunnel tidak memblokir CORS headers
2. SSL/TLS certificate valid

### C. Database Connection Error
**Gejala:** Backend error 500 saat login

**Solusi:**
```powershell
# Cek .env file
cat absensi\.env

# Pastikan DATABASE_URL benar
# Jika database remote, pastikan firewall mengizinkan koneksi
```

### D. Port Conflict
**Gejala:** Backend tidak bisa start

**Solusi:**
```powershell
# Cek port 3000
netstat -ano | findstr :3000

# Kill process jika perlu
taskkill /PID <PID> /F

# Restart PM2
pm2 restart absensi-server
```

## Testing Mobile App

### 1. Restart Expo Development Server
```powershell
cd mobile
# Tekan Ctrl+C untuk stop
npm start
```

### 2. Clear Cache
Di Expo Metro Bundler, tekan:
- `r` - Reload app
- `Shift + r` - Clear cache and reload

### 3. Test di HP
1. Pastikan HP dan komputer di jaringan yang sama (jika testing lokal)
2. Scan QR code dari Expo
3. Coba login dengan:
   - Email: `admin@demo.com`
   - Password: `admin123`

## Logs untuk Debugging

### Backend Logs
```powershell
pm2 logs absensi-server
pm2 logs absensi-server --lines 100
```

### Mobile App Logs
Lihat di terminal Expo atau di Expo Go app

### Cloudflare Tunnel Logs
```powershell
cloudflared tunnel logs <tunnel-name>
```

## Quick Fix Commands

```powershell
# Restart semua
pm2 restart all

# Reload PM2 dengan config baru
pm2 reload ecosystem.config.js

# Hard restart
pm2 delete all
cd absensi
pm2 start ecosystem.config.js
```
