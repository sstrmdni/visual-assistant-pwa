# Visual Assistant PWA

PWA untuk deteksi objek real-time dari kamera browser. Suara default sekarang kembali memakai Piper Bahasa Indonesia `id_ID-news_tts-medium` dari project `visual-assistant-yolo`.

## Jalankan

```bash
cd visual-assistant-pwa
npm start
```

Server berjalan di:

```text
http://localhost:3000
```

Untuk HP, jangan buka `localhost` dari HP. Pakai URL LAN yang dicetak di terminal, misalnya:

```text
http://192.168.1.20:3000
```

HP dan komputer harus berada di Wi-Fi/jaringan yang sama. Jika tetap tidak bisa dibuka, cek Windows Firewall dan izinkan Node.js untuk jaringan Private.

## Catatan Penting untuk HP

Browser mobile biasanya hanya mengizinkan kamera dan install PWA dari secure context:

- `https://...`
- `http://localhost` di device yang sama

Karena HP membuka komputer lewat `http://IP-KOMPUTER:3000`, halaman bisa terbuka tetapi kamera/PWA install bisa ditolak oleh browser. Untuk penggunaan HP yang stabil, jalankan lewat HTTPS tunnel/proxy atau deploy ke hosting HTTPS. Jika memakai hosting cloud, pastikan endpoint Piper juga tersedia di server tersebut.

## Suara Piper Indonesia

PWA memanggil endpoint lokal:

```text
POST /api/tts
GET /api/tts/health
```

Default path:

```text
../visual-assistant-yolo/.venv/Scripts/piper.exe
../visual-assistant-yolo/voices/id_ID-news_tts-medium.onnx
../visual-assistant-yolo/voices/id_ID-news_tts-medium.onnx.json
```

Kalau path berbeda, ubah `.env`:

```env
PIPER_BIN=../visual-assistant-yolo/.venv/Scripts/piper.exe
PIPER_MODEL=../visual-assistant-yolo/voices/id_ID-news_tts-medium.onnx
PIPER_CONFIG=../visual-assistant-yolo/voices/id_ID-news_tts-medium.onnx.json
```

Jika Piper tidak tersedia, aplikasi fallback ke Web Speech API browser. Di mode fallback ini suara bisa terdengar Inggris tergantung voice yang ada di HP.

## Cache PWA

Kalau HP masih menampilkan UI lama:

1. Tutup tab PWA.
2. Hapus app dari Home Screen jika sudah terinstall.
3. Di Chrome: Site settings -> Storage -> Clear.
4. Buka ulang URL LAN/HTTPS.

Service worker sudah memakai cache baru `visual-assistant-v3` dan tidak meng-cache endpoint `/api/tts`.

## Kontrol

- `Mulai`: meminta izin kamera lalu mulai deteksi.
- `Stop`: menghentikan kamera dan deteksi.
- `Kamera`: ganti kamera depan/belakang.
- `Suara On/Off`: aktifkan atau matikan suara.
- `Tes`: tes suara Bahasa Indonesia.

## Troubleshooting

Kamera ditolak di HP:

- Gunakan HTTPS.
- Pastikan permission kamera di browser aktif.
- Coba buka dari Chrome/Edge terbaru.

HP tidak bisa membuka alamat:

- Pastikan HP dan komputer satu jaringan.
- Gunakan IP komputer, bukan `localhost`.
- Izinkan Node.js di Windows Firewall untuk jaringan Private.
- Cek terminal `npm start`; server harus bind ke `0.0.0.0`.

Suara masih Inggris:

- Buka `http://localhost:3000/api/tts/health` di komputer.
- Pastikan `available: true`.
- Pastikan file voice Piper ada di folder `visual-assistant-yolo/voices`.
- Tekan tombol `Tes` di PWA.
