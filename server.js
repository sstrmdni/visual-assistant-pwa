const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

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
    environment: 'vercel',
    tts: { available: false, reason: 'Use browser voice' },
  });
});

app.get('/api/tts/health', (req, res) => {
  res.json({
    available: false,
    reason: 'Piper TTS not available in production. Using browser voice.',
  });
});

app.post('/api/tts', (req, res) => {
  res.status(503).json({
    error: 'Piper TTS not available',
    message: 'Piper TTS unavailable. Frontend uses browser voice API.',
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
