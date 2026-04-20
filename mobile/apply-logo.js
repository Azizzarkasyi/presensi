const fs = require('fs');
const path = require('path');

const sourcePath = 'C:\\Users\\AZIZ\\.gemini\\antigravity\\brain\\3e30db8d-3663-43d0-98d2-9136b8ed0849\\presensi_logo_1776658355140.png';
const assetsDir = path.join(__dirname, 'assets');

const filesToReplace = [
  'icon.png',
  'favicon.png',
  'adaptive-icon.png',
  'splash-icon.png' // Usually named splash.png but your app.json calls it splash-icon.png
];

try {
  const imageBuf = fs.readFileSync(sourcePath);

  for (const file of filesToReplace) {
    const targetPath = path.join(assetsDir, file);
    fs.writeFileSync(targetPath, imageBuf);
    console.log(`✅ Berhasil memperbarui ${file}`);
  }
  
  console.log('\nSelesai! Logo telah diupdate. Silakan restart browser atau server expo Anda.');
} catch (e) {
  console.error('Gagal menyalin logo:', e);
}
