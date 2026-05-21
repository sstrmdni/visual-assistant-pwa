class VisualAssistant {
  constructor() {
    this.video = document.getElementById('videoStream');
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.stage = document.querySelector('.camera-stage');
    this.cameraPlaceholder = document.getElementById('cameraPlaceholder');
    this.loading = document.getElementById('loading');
    this.loadingText = document.getElementById('loadingText');
    this.statusText = document.getElementById('statusText');
    this.statusPill = document.getElementById('statusPill');
    this.connectionHint = document.getElementById('connectionHint');
    this.fpsText = document.getElementById('fpsText');
    this.detectionList = document.getElementById('detectionList');
    this.objectCount = document.getElementById('objectCount');
    this.lastAnnouncementEl = document.getElementById('lastAnnouncement');
    this.voiceStatus = document.getElementById('voiceStatus');
    this.soundState = document.getElementById('soundState');
    this.ttsPlayer = document.getElementById('ttsPlayer');

    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.switchCameraBtn = document.getElementById('switchCameraBtn');
    this.toggleSoundBtn = document.getElementById('toggleSound');
    this.testSoundBtn = document.getElementById('testSoundBtn');
    this.installBtn = document.getElementById('installBtn');

    this.model = null;
    this.stream = null;
    this.animationFrameId = null;
    this.isStarting = false;
    this.isRunning = false;
    this.soundEnabled = localStorage.getItem('visualAssistantSound') !== 'off';
    this.facingMode = localStorage.getItem('visualAssistantCamera') || 'environment';
    this.ttsAvailable = false;
    this.ttsBackend = 'browser';
    this.browserVoiceLang = 'id-ID';
    this.speechBusy = false;
    this.pendingSpeech = '';
    this.currentAudioUrl = '';

    this.detectionHistory = new Map();
    this.lastDetections = [];
    this.lastAnnouncement = '';
    this.lastAnnouncementTime = 0;
    this.lastFpsTime = performance.now();
    this.frameCount = 0;
    this.canvasCssWidth = 1;
    this.canvasCssHeight = 1;
    this.pixelRatio = 1;

    this.CONFIDENCE_THRESHOLD = 0.55;
    this.DETECTION_HISTORY_FRAMES = 2;
    this.MIN_FRAMES_FOR_ANNOUNCEMENT = 1;
    this.VOICE_COOLDOWN_SECONDS = 5;
    this.REPEAT_SAME_ANNOUNCEMENT_SECONDS = 12;
    this.MAX_OBJECTS_PER_ANNOUNCEMENT = 3;
    this.NEAR_AREA_RATIO = 0.18;
    this.MEDIUM_AREA_RATIO = 0.06;

    this.classThresholds = {
      'cell phone': 0.2,
      book: 0.3,
      bottle: 0.4,
      cup: 0.4,
      keyboard: 0.35,
      mouse: 0.35,
      remote: 0.35,
      scissors: 0.35,
    };

    this.hazardObjects = new Set([
      'stairs',
      'car',
      'motorcycle',
      'bicycle',
      'bus',
      'truck',
      'train',
      'traffic light',
      'fire hydrant',
      'knife',
      'scissors',
    ]);

    this.announcementPriority = [
      'cell phone',
      'laptop',
      'book',
      'keyboard',
      'mouse',
      'remote',
      'bottle',
      'cup',
      'knife',
      'scissors',
      'backpack',
      'handbag',
      'umbrella',
      'chair',
      'bench',
      'dining table',
      'couch',
      'bed',
      'tv',
      'sink',
      'refrigerator',
      'car',
      'motorcycle',
      'bicycle',
      'bus',
      'truck',
      'person',
    ];
    this.priorityIndex = new Map(
      this.announcementPriority.map((label, index) => [label, index]),
    );

    this.indonesianLabels = {
      person: 'orang',
      bicycle: 'sepeda',
      car: 'mobil',
      motorcycle: 'motor',
      airplane: 'pesawat',
      bus: 'bus',
      train: 'kereta',
      truck: 'truk',
      boat: 'perahu',
      'traffic light': 'lampu lalu lintas',
      'fire hydrant': 'hidran',
      'stop sign': 'rambu stop',
      'parking meter': 'meter parkir',
      bench: 'bangku',
      bird: 'burung',
      cat: 'kucing',
      dog: 'anjing',
      horse: 'kuda',
      sheep: 'domba',
      cow: 'sapi',
      elephant: 'gajah',
      bear: 'beruang',
      zebra: 'zebra',
      giraffe: 'jerapah',
      backpack: 'tas',
      umbrella: 'payung',
      handbag: 'tas tangan',
      tie: 'dasi',
      suitcase: 'koper',
      frisbee: 'frisbee',
      skis: 'ski',
      snowboard: 'papan salju',
      'sports ball': 'bola',
      kite: 'layang layang',
      'baseball bat': 'tongkat baseball',
      'baseball glove': 'sarung tangan baseball',
      skateboard: 'skateboard',
      surfboard: 'papan selancar',
      'tennis racket': 'raket tenis',
      bottle: 'botol',
      'wine glass': 'gelas anggur',
      cup: 'gelas',
      fork: 'garpu',
      knife: 'pisau',
      spoon: 'sendok',
      bowl: 'mangkuk',
      banana: 'pisang',
      apple: 'apel',
      sandwich: 'roti lapis',
      orange: 'jeruk',
      broccoli: 'brokoli',
      carrot: 'wortel',
      'hot dog': 'hot dog',
      pizza: 'pizza',
      donut: 'donat',
      cake: 'kue',
      chair: 'kursi',
      couch: 'sofa',
      'potted plant': 'tanaman pot',
      bed: 'tempat tidur',
      'dining table': 'meja makan',
      toilet: 'toilet',
      tv: 'televisi',
      laptop: 'laptop',
      mouse: 'mouse',
      remote: 'remote',
      keyboard: 'keyboard',
      'cell phone': 'handphone',
      microwave: 'microwave',
      oven: 'oven',
      toaster: 'pemanggang roti',
      sink: 'wastafel',
      refrigerator: 'kulkas',
      book: 'buku',
      clock: 'jam',
      vase: 'vas',
      scissors: 'gunting',
      'teddy bear': 'boneka beruang',
      'hair drier': 'pengering rambut',
      toothbrush: 'sikat gigi',
    };

    this.bindEvents();
    this.init();
  }

  async init() {
    this.updateSoundUi();
    this.updateConnectionHint();
    this.setLoading(true, 'Memuat model deteksi...');
    this.registerServiceWorker();
    this.setupInstallPrompt();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.checkBrowserVoices();
        this.updateVoiceStatus();
      };
    }

    const [modelResult] = await Promise.allSettled([
      this.loadModel(),
      this.checkTts(),
    ]);

    this.setLoading(false);

    if (modelResult.status === 'rejected') {
      console.error(modelResult.reason);
      this.updateStatus('Model gagal dimuat. Cek koneksi internet untuk load pertama.', 'error');
      return;
    }

    const statusType = this.isLanHttp() ? 'warning' : 'ready';
    this.updateStatus('Siap. Tekan Mulai untuk mengaktifkan kamera.', statusType);

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.stage);
    }

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.start());
    this.stopBtn.addEventListener('click', () => this.stop());
    this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
    this.toggleSoundBtn.addEventListener('click', () => this.toggleSound());
    this.testSoundBtn.addEventListener('click', () => {
      this.announce('Tes suara Bahasa Indonesia', { force: true });
    });
  }

  async loadModel() {
    if (!window.cocoSsd) {
      throw new Error('COCO-SSD belum tersedia.');
    }

    this.model = await window.cocoSsd.load();
  }

  async checkTts() {
    try {
      const response = await fetch('/api/tts/health', { cache: 'no-store' });
      const data = await response.json();

      this.ttsAvailable = Boolean(data.available);
      this.ttsBackend = this.ttsAvailable ? 'piper' : 'browser';
      this.checkBrowserVoices();
      this.updateVoiceStatus();
    } catch (error) {
      console.warn('TTS health check failed:', error);
      this.ttsAvailable = false;
      this.ttsBackend = 'browser';
      this.checkBrowserVoices();
      this.updateVoiceStatus();
    }
  }

  checkBrowserVoices() {
    if (!('speechSynthesis' in window)) {
      this.browserVoiceLang = null;
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    
    // Cek suara Indonesia
    const indonesianVoice = voices.find((voice) => {
      const haystack = `${voice.lang} ${voice.name}`.toLowerCase();
      return haystack.includes('id') || haystack.includes('indonesia') || haystack.includes('bahasa');
    });
    
    if (indonesianVoice) {
      this.browserVoiceLang = 'id-ID';
      return;
    }
    
    // Fallback ke English jika Indonesia tidak ada
    const englishVoice = voices.find((voice) => voice.lang.startsWith('en'));
    if (englishVoice) {
      this.browserVoiceLang = 'en-US';
      return;
    }
    
    // Gunakan voice pertama yang tersedia
    if (voices.length > 0) {
      this.browserVoiceLang = voices[0].lang;
      return;
    }
    
    this.browserVoiceLang = null;
  }

  updateConnectionHint() {
    if (this.isLanHttp()) {
      this.connectionHint.textContent =
        'Mode LAN HTTP. Halaman bisa dibuka dari HP lewat IP komputer, kamera HP biasanya perlu HTTPS.';
      return;
    }

    this.connectionHint.textContent = 'Deteksi real-time dengan suara Bahasa Indonesia.';
  }

  updateVoiceStatus() {
    if (this.ttsAvailable) {
      this.voiceStatus.textContent = 'Piper Indonesia';
      return;
    }

    let voiceText = 'Browser TTS';
    if (this.browserVoiceLang === 'id-ID') {
      voiceText = 'Browser Indonesian';
    } else if (this.browserVoiceLang === 'en-US') {
      voiceText = 'Browser English';
    } else if (this.browserVoiceLang) {
      voiceText = `Browser ${this.browserVoiceLang}`;
    } else {
      voiceText = 'No voice available';
    }
    
    this.voiceStatus.textContent = voiceText;
  }

  async start() {
    if (this.isRunning || this.isStarting) return;

    if (!this.model) {
      this.updateStatus('Model belum siap.', 'error');
      return;
    }

    this.isStarting = true;
    this.startBtn.disabled = true;
    this.setLoading(true, 'Mengaktifkan kamera...');

    try {
      await this.setupCamera();
      this.isRunning = true;
      this.stopBtn.disabled = false;
      this.startBtn.textContent = 'Berjalan';
      this.updateStatus('Deteksi berjalan.', 'running');
      this.lastFpsTime = performance.now();
      this.frameCount = 0;
      this.detectObjects();
      if (this.soundEnabled) {
        this.announce('Deteksi berjalan', { force: true });
      }
    } catch (error) {
      console.error(error);
      this.startBtn.disabled = false;
      this.updateStatus(this.formatCameraError(error), 'error');
    } finally {
      this.isStarting = false;
      this.setLoading(false);
    }
  }

  stop() {
    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.stopCamera();
    this.clearCanvas();
    this.detectionHistory.clear();
    this.lastDetections = [];
    this.updateDetectionList([]);
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.startBtn.textContent = 'Mulai';
    this.cameraPlaceholder.hidden = false;
    this.updateStatus('Deteksi dihentikan.', this.isLanHttp() ? 'warning' : 'ready');
  }

  async switchCamera() {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    localStorage.setItem('visualAssistantCamera', this.facingMode);

    if (!this.stream) {
      this.updateStatus(
        this.facingMode === 'environment' ? 'Kamera belakang dipilih.' : 'Kamera depan dipilih.',
        'ready',
      );
      return;
    }

    const shouldResume = this.isRunning;
    this.stop();

    if (shouldResume) {
      await this.start();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('visualAssistantSound', this.soundEnabled ? 'on' : 'off');
    this.updateSoundUi();

    if (!this.soundEnabled) {
      this.pendingSpeech = '';
      this.ttsPlayer.pause();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }

  updateSoundUi() {
    this.soundState.textContent = this.soundEnabled ? 'Aktif' : 'Mati';
    this.toggleSoundBtn.textContent = this.soundEnabled ? 'Suara On' : 'Suara Off';
  }

  async setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser tidak mendukung kamera.');
    }

    this.stopCamera();

    const constraints = {
      video: {
        facingMode: { ideal: this.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    this.stream = stream;
    this.video.srcObject = stream;

    await new Promise((resolve) => {
      if (this.video.readyState >= 1) {
        resolve();
        return;
      }

      this.video.onloadedmetadata = () => resolve();
    });

    await this.video.play();
    this.cameraPlaceholder.hidden = true;
    this.resizeCanvas();
  }

  stopCamera() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
    }

    this.stream = null;
    this.video.srcObject = null;
  }

  async detectObjects() {
    if (!this.isRunning || !this.model) return;

    try {
      const predictions = await this.model.detect(this.video);
      const filtered = predictions.filter(
        (prediction) => prediction.score >= this.getThreshold(prediction.class),
      );

      this.updateDetectionHistory(filtered);
      const confirmed = this.getConfirmedDetections();

      this.drawDetections(confirmed);
      this.updateDetectionList(confirmed);
      this.processAnnouncements(confirmed);
      this.updateFps();
    } catch (error) {
      console.error('Detection error:', error);
    }

    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(() => this.detectObjects());
    }
  }

  getThreshold(label) {
    return this.classThresholds[label] || this.CONFIDENCE_THRESHOLD;
  }

  updateDetectionHistory(detections) {
    const labelCounts = new Map();

    for (const detection of detections) {
      labelCounts.set(detection.class, (labelCounts.get(detection.class) || 0) + 1);
    }

    for (const [label, count] of labelCounts.entries()) {
      if (!this.detectionHistory.has(label)) {
        this.detectionHistory.set(label, []);
      }

      const history = this.detectionHistory.get(label);
      history.push(count);

      if (history.length > this.DETECTION_HISTORY_FRAMES) {
        history.shift();
      }
    }

    for (const [label, history] of this.detectionHistory.entries()) {
      if (!labelCounts.has(label)) {
        history.push(0);

        if (history.length > this.DETECTION_HISTORY_FRAMES) {
          history.shift();
        }

        if (history.every((count) => count === 0)) {
          this.detectionHistory.delete(label);
        }
      }
    }

    this.lastDetections = detections;
  }

  getConfirmedDetections() {
    return this.lastDetections.filter((detection) => {
      const history = this.detectionHistory.get(detection.class) || [];
      const seenFrames = history.filter((count) => count > 0).length;
      return seenFrames >= this.MIN_FRAMES_FOR_ANNOUNCEMENT;
    });
  }

  drawDetections(detections) {
    this.resizeCanvas();
    this.clearCanvas();

    if (!this.video.videoWidth || !this.video.videoHeight) return;

    const transform = this.getVideoCoverTransform();

    for (const detection of detections) {
      const [x, y, width, height] = detection.bbox;
      const mapped = {
        x: x * transform.scale + transform.offsetX,
        y: y * transform.scale + transform.offsetY,
        width: width * transform.scale,
        height: height * transform.scale,
      };

      const meta = this.getDetectionMeta(detection);
      const isHazard = this.isHazardDetection(detection);
      const label = `${meta.labelId} ${Math.round(detection.score * 100)}%`;
      const stroke = isHazard ? '#f6b647' : '#43d19e';
      const fill = isHazard ? 'rgba(246, 182, 71, 0.92)' : 'rgba(67, 209, 158, 0.92)';

      this.ctx.lineWidth = isHazard ? 3 : 2;
      this.ctx.strokeStyle = stroke;
      this.ctx.strokeRect(mapped.x, mapped.y, mapped.width, mapped.height);

      this.ctx.font = '700 13px system-ui, sans-serif';
      const textWidth = this.ctx.measureText(label).width;
      const labelWidth = Math.min(textWidth + 16, this.canvasCssWidth - 12);
      const labelX = Math.max(6, Math.min(mapped.x, this.canvasCssWidth - labelWidth - 6));
      const labelY = Math.max(6, mapped.y - 30);

      this.ctx.fillStyle = fill;
      this.ctx.fillRect(labelX, labelY, labelWidth, 24);
      this.ctx.fillStyle = '#07100b';
      this.ctx.fillText(label, labelX + 8, labelY + 16);
    }
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvasCssWidth, this.canvasCssHeight);
  }

  resizeCanvas() {
    const rect = this.stage.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const canvasWidth = Math.round(width * pixelRatio);
    const canvasHeight = Math.round(height * pixelRatio);

    if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
    }

    this.canvasCssWidth = width;
    this.canvasCssHeight = height;
    this.pixelRatio = pixelRatio;
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  getVideoCoverTransform() {
    const videoWidth = this.video.videoWidth || this.canvasCssWidth;
    const videoHeight = this.video.videoHeight || this.canvasCssHeight;
    const scale = Math.max(
      this.canvasCssWidth / videoWidth,
      this.canvasCssHeight / videoHeight,
    );

    return {
      scale,
      offsetX: (this.canvasCssWidth - videoWidth * scale) / 2,
      offsetY: (this.canvasCssHeight - videoHeight * scale) / 2,
    };
  }

  updateDetectionList(detections) {
    this.objectCount.textContent = `${detections.length} terdeteksi`;

    if (detections.length === 0) {
      this.detectionList.innerHTML = '<p class="empty-text">Belum ada objek stabil.</p>';
      return;
    }

    const grouped = new Map();
    for (const detection of detections) {
      const key = detection.class;
      const meta = this.getDetectionMeta(detection);

      if (!grouped.has(key)) {
        grouped.set(key, {
          label: meta.labelId,
          count: 0,
          score: detection.score,
          position: meta.position,
          distance: meta.distance,
          hazard: this.isHazardDetection(detection),
          priority: this.getPriorityIndex(detection.class),
        });
      }

      const item = grouped.get(key);
      item.count += 1;
      item.score = Math.max(item.score, detection.score);
      item.hazard = item.hazard || this.isHazardDetection(detection);
    }

    const items = [...grouped.values()].sort((a, b) => {
      if (a.hazard !== b.hazard) return a.hazard ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.score - a.score;
    });

    this.detectionList.innerHTML = '';

    for (const item of items) {
      const el = document.createElement('div');
      el.className = `detection-item${item.hazard ? ' detection-item--hazard' : ''}`;
      el.innerHTML = `
        <div class="item-label">
          <span>${item.label}</span>
          <span class="item-count">${item.count}x</span>
        </div>
        <div class="item-meta">
          ${this.getDistanceText(item.distance)} ${this.getPositionText(item.position)}
          · ${Math.round(item.score * 100)}%
        </div>
      `;
      this.detectionList.appendChild(el);
    }
  }

  processAnnouncements(detections) {
    if (!detections.length) return;

    const now = Date.now();
    if (now - this.lastAnnouncementTime < this.VOICE_COOLDOWN_SECONDS * 1000) {
      return;
    }

    const announcementCandidates = this.getAnnouncementCandidates(detections);
    const announcement = this.buildAnnouncement(announcementCandidates);
    const sameAnnouncement = announcement === this.lastAnnouncement;
    const repeatAllowed =
      now - this.lastAnnouncementTime >= this.REPEAT_SAME_ANNOUNCEMENT_SECONDS * 1000;

    if (!sameAnnouncement || repeatAllowed) {
      this.lastAnnouncement = announcement;
      this.lastAnnouncementTime = now;
      this.announce(announcement);
    }
  }

  getAnnouncementCandidates(detections) {
    const hazards = detections.filter((detection) => this.isHazardDetection(detection));
    if (hazards.length) return hazards;

    const nonPerson = detections.filter((detection) => detection.class !== 'person');
    if (nonPerson.length) return nonPerson;

    return detections;
  }

  buildAnnouncement(detections) {
    const grouped = new Map();

    for (const detection of detections) {
      const meta = this.getDetectionMeta(detection);
      const key = `${detection.class}-${meta.position}-${meta.distance}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          labelEn: detection.class,
          labelId: meta.labelId,
          position: meta.position,
          distance: meta.distance,
          count: 0,
          score: detection.score,
          area: meta.areaRatio,
          hazard: this.isHazardDetection(detection),
        });
      }

      const group = grouped.get(key);
      group.count += 1;
      group.score = Math.max(group.score, detection.score);
      group.area = Math.max(group.area, meta.areaRatio);
    }

    const groups = [...grouped.values()].sort((a, b) => {
      if (a.hazard !== b.hazard) return a.hazard ? -1 : 1;
      const priorityDiff = this.getPriorityIndex(a.labelEn) - this.getPriorityIndex(b.labelEn);
      if (priorityDiff !== 0) return priorityDiff;
      if (b.score !== a.score) return b.score - a.score;
      return b.area - a.area;
    });

    const shown = groups.slice(0, this.MAX_OBJECTS_PER_ANNOUNCEMENT);
    const phrases = shown.map((group) => {
      const objectText =
        group.count > 1 ? `${this.numberToIndonesian(group.count)} ${group.labelId}` : group.labelId;

      return `${objectText} ${this.getDistanceText(group.distance)} ${this.getPositionText(group.position)}`;
    });

    const remaining = groups.length - shown.length;
    if (remaining > 0) {
      phrases.push(`${this.numberToIndonesian(remaining)} objek lainnya`);
    }

    const prefix = groups.some((group) => group.hazard) ? 'Hati-hati, ada' : 'Ada';

    if (phrases.length === 1) {
      return `${prefix} ${phrases[0]}`;
    }

    return `${prefix} ${phrases.slice(0, -1).join(', ')}, dan ${phrases[phrases.length - 1]}`;
  }

  async announce(text, options = {}) {
    this.lastAnnouncementEl.textContent = text;

    if (!this.soundEnabled && !options.force) {
      return;
    }

    this.pendingSpeech = text;
    this.flushSpeechQueue();
  }

  async flushSpeechQueue() {
    if (this.speechBusy || !this.pendingSpeech) return;

    const text = this.pendingSpeech;
    this.pendingSpeech = '';
    this.speechBusy = true;

    try {
      if (this.ttsAvailable) {
        await this.speakWithPiper(text);
      } else {
        await this.speakWithBrowser(text);
      }
    } catch (error) {
      console.warn('TTS playback failed:', error);
      if (this.ttsAvailable) {
        this.ttsAvailable = false;
        this.ttsBackend = 'browser';
        this.updateVoiceStatus();
        await this.speakWithBrowser(text);
      }
    } finally {
      this.speechBusy = false;
      if (this.pendingSpeech) {
        this.flushSpeechQueue();
      }
    }
  }

  async speakWithPiper(text) {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Piper HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }

    this.currentAudioUrl = url;
    this.ttsPlayer.pause();
    this.ttsPlayer.currentTime = 0;

    await new Promise((resolve, reject) => {
      const cleanup = () => {
        this.ttsPlayer.onended = null;
        this.ttsPlayer.onerror = null;
        URL.revokeObjectURL(url);
        if (this.currentAudioUrl === url) {
          this.currentAudioUrl = '';
        }
      };

      this.ttsPlayer.onended = () => {
        cleanup();
        resolve();
      };
      this.ttsPlayer.onerror = () => {
        cleanup();
        reject(new Error('Audio Piper tidak bisa diputar.'));
      };

      this.ttsPlayer.src = url;
      this.ttsPlayer.play().catch((error) => {
        cleanup();
        reject(error);
      });
    });
  }

  speakWithBrowser(text) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.browserVoiceLang || 'id-ID';
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      
      let selectedVoice = null;
      
      // Cari suara sesuai bahasa yang terdeteksi
      if (this.browserVoiceLang === 'id-ID') {
        // Cari Indonesian voice
        selectedVoice = voices.find((voice) => {
          const haystack = `${voice.lang} ${voice.name}`.toLowerCase();
          return haystack.includes('id') || haystack.includes('indonesia') || haystack.includes('bahasa');
        });
      } else if (this.browserVoiceLang === 'en-US') {
        // Cari English voice
        selectedVoice = voices.find((voice) => voice.lang.startsWith('en'));
      } else if (this.browserVoiceLang) {
        // Cari voice sesuai bahasa yang tersedia
        selectedVoice = voices.find((voice) => voice.lang === this.browserVoiceLang);
      }
      
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  getDetectionMeta(detection) {
    const [x, , width, height] = detection.bbox;
    const centerX = x + width / 2;
    const videoWidth = this.video.videoWidth || 1;
    const videoHeight = this.video.videoHeight || 1;
    const third = videoWidth / 3;
    const areaRatio = (width * height) / Math.max(1, videoWidth * videoHeight);

    let position = 'tengah';
    if (centerX < third) position = 'kiri';
    if (centerX > third * 2) position = 'kanan';

    let distance = 'jauh';
    if (areaRatio >= this.NEAR_AREA_RATIO) {
      distance = 'dekat';
    } else if (areaRatio >= this.MEDIUM_AREA_RATIO) {
      distance = 'sedang';
    }

    return {
      labelId: this.indonesianLabels[detection.class] || detection.class,
      position,
      distance,
      areaRatio,
    };
  }

  isHazardDetection(detection) {
    const meta = this.getDetectionMeta(detection);
    return this.hazardObjects.has(detection.class) && meta.distance !== 'jauh';
  }

  getPriorityIndex(label) {
    return this.priorityIndex.get(label) ?? 999;
  }

  getDistanceText(distance) {
    if (distance === 'dekat') return 'dekat';
    if (distance === 'sedang') return 'agak dekat';
    return 'agak jauh';
  }

  getPositionText(position) {
    if (position === 'kiri') return 'di sebelah kiri';
    if (position === 'kanan') return 'di sebelah kanan';
    return 'di depan tengah';
  }

  numberToIndonesian(number) {
    const words = {
      1: 'satu',
      2: 'dua',
      3: 'tiga',
      4: 'empat',
      5: 'lima',
      6: 'enam',
      7: 'tujuh',
      8: 'delapan',
      9: 'sembilan',
      10: 'sepuluh',
    };

    return words[number] || String(number);
  }

  updateFps() {
    this.frameCount += 1;
    const now = performance.now();
    const elapsed = (now - this.lastFpsTime) / 1000;

    if (elapsed >= 1) {
      const fps = Math.round(this.frameCount / elapsed);
      this.frameCount = 0;
      this.lastFpsTime = now;
      this.fpsText.textContent = `FPS ${fps}`;
    }
  }

  setLoading(show, text = 'Memproses...') {
    this.loading.hidden = !show;
    this.loadingText.textContent = text;
  }

  updateStatus(text, type = 'ready') {
    this.statusText.textContent = text;
    this.statusPill.textContent = this.getStatusLabel(type);
    this.statusPill.className = `status-pill status-pill--${type}`;
  }

  getStatusLabel(type) {
    const labels = {
      idle: 'Siap',
      ready: 'Siap',
      running: 'Aktif',
      warning: 'Perlu HTTPS',
      error: 'Error',
    };

    return labels[type] || 'Siap';
  }

  formatCameraError(error) {
    if (this.isLanHttp()) {
      return 'Kamera HP biasanya ditolak di HTTP LAN. Gunakan HTTPS tunnel/proxy atau deploy HTTPS.';
    }

    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Izin kamera ditolak. Buka pengaturan browser lalu izinkan kamera.';
    }

    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return 'Kamera tidak ditemukan. Coba tombol Kamera atau cek perangkat.';
    }

    return `Kamera gagal: ${error.message || 'tidak diketahui'}`;
  }

  isLanHttp() {
    return location.protocol === 'http:' && !this.isLocalHost(location.hostname);
  }

  isLocalHost(hostname) {
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  }

  setupInstallPrompt() {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      this.installBtn.hidden = false;
    });

    this.installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      this.installBtn.hidden = true;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.visualAssistant = new VisualAssistant();
});
