const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const YOLO_DIR = path.resolve(__dirname, '..', 'visual-assistant-yolo');

const PIPER_BIN = resolveConfiguredPath(
  process.env.PIPER_BIN,
  path.join(
    YOLO_DIR,
    '.venv',
    'Scripts',
    process.platform === 'win32' ? 'piper.exe' : 'piper',
  ),
);
const PIPER_MODEL = resolveConfiguredPath(
  process.env.PIPER_MODEL,
  path.join(YOLO_DIR, 'voices', 'id_ID-news_tts-medium.onnx'),
);
const PIPER_CONFIG = resolveConfiguredPath(
  process.env.PIPER_CONFIG,
  path.join(YOLO_DIR, 'voices', 'id_ID-news_tts-medium.onnx.json'),
);
const PIPER_LENGTH_SCALE = process.env.PIPER_LENGTH_SCALE || '1.0';
const PIPER_SENTENCE_SILENCE = process.env.PIPER_SENTENCE_SILENCE || '0.15';
const PIPER_VOLUME = process.env.PIPER_VOLUME || '1.0';
const MAX_TTS_CHARS = Number(process.env.MAX_TTS_CHARS || 220);
const TTS_TIMEOUT_MS = Number(process.env.TTS_TIMEOUT_MS || 15000);

app.use(cors());
app.use(express.json({ limit: '16kb' }));

app.use(
  express.static(PUBLIC_DIR, {
    etag: true,
    setHeaders: (res, filePath) => {
      const filename = path.basename(filePath);
      if (filename === 'service-worker.js') {
        res.setHeader('Cache-Control', 'no-store');
        return;
      }

      if (/\.(html|js|css|json|webmanifest|svg)$/i.test(filename)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    urls: getLocalUrls(PORT),
    tts: getTtsStatus(),
  });
});

app.get('/api/network', (req, res) => {
  res.json({ urls: getLocalUrls(PORT), secure: req.secure });
});

app.get('/api/tts/health', (req, res) => {
  res.json(getTtsStatus());
});

app.post('/api/tts', async (req, res) => {
  const text = normalizeTtsText(req.body && req.body.text);
  if (!text) {
    res.status(400).json({ error: 'Teks TTS kosong.' });
    return;
  }

  const status = getTtsStatus();
  if (!status.available) {
    res.status(503).json({
      error: 'Piper TTS belum siap.',
      details: status,
    });
    return;
  }

  const wavPath = path.join(
    os.tmpdir(),
    `visual-assistant-${Date.now()}-${crypto.randomUUID()}.wav`,
  );

  try {
    await synthesizeWithPiper(text, wavPath);

    res.type('audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(wavPath, (error) => {
      cleanupTempFile(wavPath);
      if (error && !res.headersSent) {
        res.status(500).json({ error: 'Audio TTS gagal dikirim.' });
      }
    });
  } catch (error) {
    await cleanupTempFile(wavPath);
    res.status(500).json({
      error: 'Gagal membuat audio Piper.',
      message: error.message,
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

if (require.main === module) {
  startServer();
}

function startServer() {
  return app.listen(PORT, HOST, () => {
    console.log('');
    console.log(`[OK] Visual Assistant PWA berjalan di http://localhost:${PORT}`);
    console.log('[INFO] Untuk HP, gunakan URL LAN di bawah ini, bukan localhost:');

    for (const url of getLocalUrls(PORT)) {
      console.log(`       ${url}`);
    }

    console.log('');
    console.log('[INFO] Catatan HP: akses kamera dan install PWA biasanya butuh HTTPS.');
    console.log('[INFO] Jika kamera ditolak di HTTP LAN, pakai HTTPS tunnel/proxy atau deploy HTTPS.');
    console.log('');
  });
}

function normalizeTtsText(value) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TTS_CHARS);
}

function resolveConfiguredPath(value, fallback) {
  const selected = value || fallback;
  return path.isAbsolute(selected) ? selected : path.resolve(__dirname, selected);
}

function getTtsStatus() {
  const executableExists = fs.existsSync(PIPER_BIN);
  const modelExists = fs.existsSync(PIPER_MODEL);
  const configExists = fs.existsSync(PIPER_CONFIG);

  return {
    backend: 'piper',
    language: 'id-ID',
    voice: 'id_ID-news_tts-medium',
    available: executableExists && modelExists,
    executableExists,
    modelExists,
    configExists,
    executable: PIPER_BIN,
    model: PIPER_MODEL,
    config: PIPER_CONFIG,
  };
}

function synthesizeWithPiper(text, wavPath) {
  const args = [
    '-m',
    PIPER_MODEL,
    '-f',
    wavPath,
    '--length-scale',
    PIPER_LENGTH_SCALE,
    '--sentence-silence',
    PIPER_SENTENCE_SILENCE,
    '--volume',
    PIPER_VOLUME,
  ];

  if (fs.existsSync(PIPER_CONFIG)) {
    args.push('-c', PIPER_CONFIG);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let stderr = '';

    const child = spawn(PIPER_BIN, args, {
      cwd: YOLO_DIR,
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error('Piper TTS timeout.'));
      }
    }, TTS_TIMEOUT_MS);

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 1200) {
        stderr = stderr.slice(-1200);
      }
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code === 0 && fs.existsSync(wavPath)) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `Piper keluar dengan kode ${code}.`));
    });

    child.stdin.end(text);
  });
}

async function cleanupTempFile(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[WARN] Gagal menghapus file temp: ${filePath}`);
    }
  }
}

function getLocalUrls(port) {
  return getLocalIPs().map((ip) => `http://${ip}:${port}`);
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const ifaceList of Object.values(interfaces)) {
    for (const iface of ifaceList || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return [...new Set(addresses)];
}

module.exports = {
  app,
  startServer,
  getTtsStatus,
  synthesizeWithPiper,
};
