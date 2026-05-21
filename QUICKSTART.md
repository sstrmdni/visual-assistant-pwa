# Quickstart

```bash
cd visual-assistant-pwa
npm start
```

Buka di komputer:

```text
http://localhost:3000
```

Buka di HP:

1. Pastikan HP dan komputer satu Wi-Fi.
2. Lihat URL LAN yang muncul di terminal, misalnya `http://192.168.1.20:3000`.
3. Buka URL itu dari browser HP.
4. Tekan `Mulai` dan izinkan kamera.

Catatan: kamera dan install PWA di HP sering butuh HTTPS. Jika browser menolak kamera saat memakai `http://IP-KOMPUTER:3000`, jalankan lewat HTTPS tunnel/proxy atau hosting HTTPS.

Tes suara Piper:

```text
http://localhost:3000/api/tts/health
```

Status harus menunjukkan `available: true`. Jika tidak, cek path Piper dan file voice di `.env`.
