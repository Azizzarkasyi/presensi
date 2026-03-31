# Cara Menjalankan Aplikasi Presensi

## Metode 1: Buka Lewat Browser (Paling Praktis & Bisa Dimana Saja)
Aplikasi sudah di-deploy secara lokal menggunakan PM2 dan di-online-kan melalui Cloudflare Tunnel. Anda dan tester bisa langsung membukanya di HP atau Laptop manapun tanpa install apa-apa!

- **Aplikasi Web / Frontend:** `https://app-presensi.yexsx.my.id`
- **Backend API:** `https://api-presensi.yexsx.my.id/api`

### Pastikan Tunnel & Server Berjalan:
Jika aplikasi tidak bisa dibuka, jalankan di PowerShell laptop server Anda:
```powershell
# 1. Pastikan PM2 berjalan (absensi-server & absensi-web)
pm2 list

# 2. Pastikan Tunnel Berjalan
cloudflared tunnel run presensi-backend
```

## Metode 2: Manual

### Backend (dengan PM2)
```powershell
cd absensi
pm2 start ecosystem.config.js
pm2 list
```

### Frontend (di terminal terpisah)
```powershell
cd mobile
npm start
```

## PM2 Commands

- `pm2 list` - Lihat status aplikasi
- `pm2 logs` - Lihat logs real-time
- `pm2 logs absensi-server` - Lihat logs backend saja
- `pm2 stop absensi-server` - Stop backend
- `pm2 restart absensi-server` - Restart backend
- `pm2 delete absensi-server` - Hapus dari PM2

## Credentials

- **Admin**: `admin@demo.com` / `admin123`
- **User**: `user@demo.com` / `user123`

## Troubleshooting

### Backend tidak jalan
```powershell
cd absensi
pm2 logs absensi-server
```

### Mobile app error
```powershell
cd mobile
npm install
npm start
```

### Reset semua
```powershell
pm2 delete all
cd absensi
pm2 start ecosystem.config.js
```
