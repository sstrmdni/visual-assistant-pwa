# Deployment

Visual Assistant PWA sekarang punya backend kecil untuk Piper TTS:

```text
POST /api/tts
GET /api/tts/health
```

Artinya deploy static murni seperti Netlify static hosting tidak cukup jika ingin suara Piper Indonesia tetap aktif. Static deploy masih bisa membuka UI, tetapi suara akan fallback ke voice browser.

## Local LAN

```powershell
cd visual-assistant-pwa
npm install
npm start
```

Buka di komputer:

```text
http://localhost:3000
```

Buka di HP:

```text
http://IP-KOMPUTER:3000
```

Gunakan IP yang muncul di terminal saat server start. Jika HP tidak bisa membuka URL, cek:

- HP dan komputer harus satu jaringan.
- Gunakan IP komputer, bukan `localhost`.
- Izinkan Node.js di Windows Firewall untuk jaringan Private.

## HTTPS untuk HP

Kamera dan install PWA di mobile biasanya perlu HTTPS. Untuk penggunaan di HP, jalankan Express server ini di belakang HTTPS tunnel/proxy atau reverse proxy HTTPS.

Pilihan umum:

- Cloudflare Tunnel
- ngrok
- Caddy
- Nginx + Let's Encrypt

Pastikan URL HTTPS tetap mengarah ke server Node ini agar `/api/tts` tersedia.

## VPS / Self-hosted

Contoh dengan PM2:

```bash
cd visual-assistant-pwa
npm install --production
npm install -g pm2
pm2 start server.js --name visual-assistant
pm2 save
```

Pastikan file berikut ikut tersedia di server:

```text
visual-assistant-yolo/.venv/Scripts/piper.exe
visual-assistant-yolo/voices/id_ID-news_tts-medium.onnx
visual-assistant-yolo/voices/id_ID-news_tts-medium.onnx.json
```

Di Linux, path `piper.exe` diganti executable `piper` yang sesuai. Atur `.env`:

```env
PORT=3000
HOST=0.0.0.0
PIPER_BIN=/path/to/piper
PIPER_MODEL=/path/to/id_ID-news_tts-medium.onnx
PIPER_CONFIG=/path/to/id_ID-news_tts-medium.onnx.json
```

## Reverse Proxy HTTPS

Contoh Nginx ringkas:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## Health Check

```bash
curl https://your-domain.com/api/health
curl https://your-domain.com/api/tts/health
```

`/api/tts/health` harus menunjukkan:

```json
{
  "available": true,
  "voice": "id_ID-news_tts-medium"
}
```

## Troubleshooting

Port sudah dipakai:

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

PWA masih tampil versi lama:

- Hapus app dari Home Screen.
- Clear site storage di browser.
- Buka ulang URL.

Suara masih Inggris:

- Cek `/api/tts/health`.
- Pastikan `available: true`.
- Tekan tombol `Tes`.
