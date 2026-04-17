module.exports = {
  apps: [
    {
      name: 'absensi-server',
      script: './absensi/index.js', // Pastikan path ini benar dari root project
      env: {
        NODE_ENV: 'production',
        PORT: 3000 // Backend jalan di 3000
      }
    },
    {
      name: 'absensi-web',
      script: 'npx',
      args: 'serve -s mobile/dist -l 5000', // Frontend jalan di 5000 (sebagai cadangan)
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};