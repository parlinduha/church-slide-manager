const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// ─── Setup folder uploads ────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|mp3|wav|ogg|m4a)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Tipe file tidak didukung'));
  },
});

// ─── Tabel welcome slides ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS welcome_slides (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT    DEFAULT 'Selamat Datang',
    subtitle  TEXT    DEFAULT '',
    body_text TEXT    DEFAULT '',
    media_url TEXT    DEFAULT '',
    media_type TEXT   DEFAULT '',   -- 'image' | 'video' | 'audio' | ''
    bg_color  TEXT    DEFAULT '#1a0a3d',
    text_color TEXT   DEFAULT '#FFFFFF',
    font_size  INTEGER DEFAULT 52,
    font_family TEXT  DEFAULT 'Georgia',
    text_align  TEXT  DEFAULT 'center',
    show_countdown INTEGER DEFAULT 0,
    countdown_target TEXT DEFAULT '',   -- ISO datetime string
    sort_order  INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed slide default jika kosong
const cnt = db.prepare('SELECT COUNT(*) as c FROM welcome_slides').get();
if (cnt.c === 0) {
  db.prepare(`
    INSERT INTO welcome_slides (title, subtitle, body_text, bg_color, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    'Selamat Datang',
    'Ibadah Minggu Pagi',
    'Silakan matikan atau hening-kan ponsel Anda',
    '#0f172a',
    0
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function parseSlide(row) {
  return { ...row, show_countdown: !!row.show_countdown };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET semua slide welcome
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM welcome_slides ORDER BY sort_order, id').all();
  res.json({ success: true, data: rows.map(parseSlide) });
});

// GET satu slide
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM welcome_slides WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Slide tidak ditemukan' });
  res.json({ success: true, data: parseSlide(row) });
});

// POST buat slide baru
router.post('/', (req, res) => {
  const { title, subtitle, body_text, bg_color, text_color, font_size, font_family,
          text_align, show_countdown, countdown_target, sort_order } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM welcome_slides').get().m ?? 0;
  const result = db.prepare(`
    INSERT INTO welcome_slides
      (title, subtitle, body_text, bg_color, text_color, font_size, font_family,
       text_align, show_countdown, countdown_target, sort_order)
    VALUES (@title,@subtitle,@body_text,@bg_color,@text_color,@font_size,@font_family,
            @text_align,@show_countdown,@countdown_target,@sort_order)
  `).run({
    title: title || 'Slide Baru', subtitle: subtitle || '', body_text: body_text || '',
    bg_color: bg_color || '#0f172a', text_color: text_color || '#FFFFFF',
    font_size: font_size || 52, font_family: font_family || 'Georgia',
    text_align: text_align || 'center', show_countdown: show_countdown ? 1 : 0,
    countdown_target: countdown_target || '', sort_order: sort_order ?? maxOrder + 1,
  });
  const row = db.prepare('SELECT * FROM welcome_slides WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: parseSlide(row) });
});

// PUT update slide
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM welcome_slides WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Slide tidak ditemukan' });

  const fields = ['title','subtitle','body_text','media_url','media_type','bg_color',
                  'text_color','font_size','font_family','text_align','show_countdown',
                  'countdown_target','sort_order'];
  const updates = [];
  const params = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = f === 'show_countdown' ? (req.body[f] ? 1 : 0) : req.body[f];
    }
  }
  if (!updates.length) return res.status(400).json({ success: false, error: 'Tidak ada data yang diubah' });
  params.id = req.params.id;
  db.prepare(`UPDATE welcome_slides SET ${updates.join(', ')} WHERE id = @id`).run(params);

  const row = db.prepare('SELECT * FROM welcome_slides WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: parseSlide(row) });
});

// DELETE hapus slide
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM welcome_slides WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Slide tidak ditemukan' });
  // Hapus file media jika ada
  if (row.media_url) {
    const filePath = path.join(UPLOAD_DIR, path.basename(row.media_url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare('DELETE FROM welcome_slides WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Slide dihapus' });
});

// POST upload file media
router.post('/media/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'File tidak ditemukan' });
  const url = `/api/welcome/media/${req.file.filename}`;
  const mime = req.file.mimetype;
  let media_type = 'image';
  if (mime.startsWith('video/')) media_type = 'video';
  else if (mime.startsWith('audio/')) media_type = 'audio';
  res.json({ success: true, data: { url, filename: req.file.filename, media_type } });
});

// GET serve file media
router.get('/media/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File tidak ditemukan');
  res.sendFile(filePath);
});

// DELETE hapus file media
router.delete('/media/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ success: true });
});

module.exports = router;
