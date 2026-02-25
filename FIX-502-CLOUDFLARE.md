# Fix 502 Bad Gateway - Cloudflare Tunnel Setup

## 🔴 Masalah Teridentifikasi
Backend mengembalikan **502 Bad Gateway** - artinya Cloudflare tunnel **tidak bisa terhubung** ke backend lokal Anda.

## ✅ Solusi Lengkap

### Step 1: Pastikan Backend Berjalan Lokal

```powershell
# Cek status PM2
pm2 list

# Pastikan absensi-server status: online
# Jika tidak, jalankan:
cd c:\cloudfire\project\presensi\absensi
pm2 start ecosystem.config.js
```

**Test lokal:**
```powershell
# Buka browser atau jalankan:
curl http://localhost:3000/api
```

**Expected response:**
```json
{
  "success": true,
  "message": "Multi-Tenant Attendance API is running",
  "version": "2.0.0"
}
```

### Step 2: Setup Cloudflare Tunnel

#### A. Install Cloudflared (jika belum)
```powershell
# Download dari: https://github.com/cloudflare/cloudflared/releases
# Atau install via winget:
winget install --id Cloudflare.cloudflared
```

#### B. Login ke Cloudflare
```powershell
cloudflared tunnel login
```
Ini akan membuka browser untuk autentikasi.

#### C. Create Tunnel
```powershell
# Buat tunnel baru
cloudflared tunnel create presensi-backend

# Catat Tunnel ID yang muncul
```

#### D. Create Config File
Buat file `config.yml` di folder yang sama dengan cloudflared:

**Lokasi:** `C:\Users\<YourUsername>\.cloudflared\config.yml`

```yaml
tunnel: <TUNNEL_ID_DARI_STEP_C>
credentials-file: C:\Users\<YourUsername>\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: api-presensi.yexsx.my.id
    service: http://localhost:3000
  - service: http_status:404
```

**⚠️ PENTING:** Ganti `<TUNNEL_ID_DARI_STEP_C>` dengan ID tunnel Anda!

#### E. Route DNS
```powershell
cloudflared tunnel route dns presensi-backend api-presensi.yexsx.my.id
```

#### F. Run Tunnel
```powershell
cloudflared tunnel run presensi-backend
```

**Atau run dengan config file:**
```powershell
cloudflared tunnel --config C:\Users\<YourUsername>\.cloudflared\config.yml run
```

### Step 3: Verifikasi Koneksi

```powershell
# Test dari PowerShell
.\test-connection.ps1

# Atau test manual:
curl https://api-presensi.yexsx.my.id/api
```

### Step 4: Setup Cloudflared sebagai Service (Optional)

Agar tunnel berjalan otomatis:

```powershell
# Install sebagai Windows service
cloudflared service install
```

## 🔧 Troubleshooting

### Error: "Tunnel credentials file not found"
```powershell
# List semua tunnel
cloudflared tunnel list

# Cek lokasi credentials
dir C:\Users\<YourUsername>\.cloudflared\*.json
```

### Error: "Connection refused"
- Pastikan backend berjalan di `localhost:3000`
- Cek firewall Windows tidak memblokir port 3000

### Error: "DNS not configured"
```powershell
# Route ulang DNS
cloudflared tunnel route dns presensi-backend api-presensi.yexsx.my.id
```

### Tunnel tidak stabil
```powershell
# Restart tunnel
# Tekan Ctrl+C untuk stop
cloudflared tunnel run presensi-backend
```

## 📋 Checklist Lengkap

- [ ] Backend berjalan di `localhost:3000` (cek dengan `pm2 list`)
- [ ] Cloudflared terinstall
- [ ] Tunnel dibuat (`cloudflared tunnel create`)
- [ ] Config file dibuat (`config.yml`)
- [ ] DNS di-route (`cloudflared tunnel route dns`)
- [ ] Tunnel berjalan (`cloudflared tunnel run`)
- [ ] Test berhasil (`.\test-connection.ps1`)
- [ ] Mobile app bisa connect

## 🚀 Quick Start (Jika Tunnel Sudah Ada)

```powershell
# Terminal 1: Backend
cd c:\cloudfire\project\presensi\absensi
pm2 start ecosystem.config.js

# Terminal 2: Cloudflare Tunnel
cloudflared tunnel run presensi-backend

# Terminal 3: Test
cd c:\cloudfire\project\presensi
.\test-connection.ps1
```

## 📱 Setelah Tunnel Berjalan

1. **Mobile app sudah diupdate** ke URL Cloudflare
2. **Restart Expo:**
   ```powershell
   cd mobile
   npm start
   ```
3. **Test login** dengan:
   - Email: `admin@demo.com`
   - Password: `admin123`

## ℹ️ Catatan Penting

- Cloudflare tunnel **HARUS** berjalan bersamaan dengan backend
- Jika komputer restart, jalankan ulang tunnel
- Untuk production, install cloudflared sebagai service
- Mobile app sekarang akan connect ke `https://api-presensi.yexsx.my.id/api`
