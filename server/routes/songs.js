const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');

// ─── Upload folder untuk background media lagu ─────────────────────────────
const DATA_DIR  = process.env.DATA_DIR || path.join(__dirname, '../data');
const MEDIA_DIR = path.join(DATA_DIR, 'song-media');
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: MEDIA_DIR,
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `song-bg-${Date.now()}-${Math.random().toString(36).slice(2,7)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi)$/i.test(file.originalname);
    cb(ok ? null : new Error('Hanya gambar dan video yang diizinkan'), ok);
  },
});

// POST upload background media untuk lagu
router.post('/media/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'File tidak ada' });
  const mime = req.file.mimetype;
  const mediaType = mime.startsWith('video/') ? 'video' : 'image';
  const url = `/api/songs/media/${req.file.filename}`;
  res.json({ success: true, data: { url, filename: req.file.filename, mediaType } });
});

// GET serve file media
router.get('/media/:filename', (req, res) => {
  const filePath = path.join(MEDIA_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File tidak ditemukan');
  res.sendFile(filePath);
});

// DELETE hapus file media
router.delete('/media/:filename', (req, res) => {
  const filePath = path.join(MEDIA_DIR, req.params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ success: true });
});

// GET semua lagu
router.get('/', (req, res) => {
  try {
    const { search, tag } = req.query;
    let query = 'SELECT * FROM songs';
    const params = [];

    if (search) {
      query += ' WHERE (title LIKE ? OR author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (tag) {
      const connector = search ? ' AND' : ' WHERE';
      query += `${connector} tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    query += ' ORDER BY title ASC';
    const songs = db.prepare(query).all(...params);

    // Parse JSON fields
    const parsed = songs.map(s => ({
      ...s,
      slides: JSON.parse(s.slides || '[]'),
      tags: JSON.parse(s.tags || '[]'),
    }));

    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET satu lagu by ID
router.get('/:id', (req, res) => {
  try {
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
    if (!song) return res.status(404).json({ success: false, error: 'Lagu tidak ditemukan' });

    res.json({
      success: true,
      data: {
        ...song,
        slides: JSON.parse(song.slides || '[]'),
        tags: JSON.parse(song.tags || '[]'),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST buat lagu baru
router.post('/', (req, res) => {
  try {
    const { title, author, key_signature, tempo, tags, slides, background_color,
            text_color, font_size, font_family, text_align,
            bg_type, bg_config, bg_media_url, bg_media_type } = req.body;

    if (!title) return res.status(400).json({ success: false, error: 'Judul lagu wajib diisi' });

    const stmt = db.prepare(`
      INSERT INTO songs (title, author, key_signature, tempo, tags, slides,
        background_color, text_color, font_size, font_family, text_align,
        bg_type, bg_config, bg_media_url, bg_media_type)
      VALUES (@title, @author, @key_signature, @tempo, @tags, @slides,
        @background_color, @text_color, @font_size, @font_family, @text_align,
        @bg_type, @bg_config, @bg_media_url, @bg_media_type)
    `);

    const result = stmt.run({
      title,
      author: author || '',
      key_signature: key_signature || '',
      tempo: tempo || 120,
      tags: JSON.stringify(tags || []),
      slides: JSON.stringify(slides || []),
      background_color: background_color || '#000000',
      text_color: text_color || '#FFFFFF',
      font_size: font_size || 48,
      font_family: font_family || 'Arial',
      text_align: text_align || 'center',
      bg_type: bg_type || 'solid',
      bg_config: typeof bg_config === 'object' ? JSON.stringify(bg_config) : (bg_config || '{}'),
      bg_media_url: bg_media_url || '',
      bg_media_type: bg_media_type || '',
    });

    const newSong = db.prepare('SELECT * FROM songs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      success: true,
      data: { ...newSong, slides: JSON.parse(newSong.slides), tags: JSON.parse(newSong.tags) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update lagu
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM songs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Lagu tidak ditemukan' });

    const { title, author, key_signature, tempo, tags, slides, background_color,
            text_color, font_size, font_family, text_align,
            bg_type, bg_config, bg_media_url, bg_media_type } = req.body;

    db.prepare(`
      UPDATE songs SET
        title = COALESCE(@title, title),
        author = COALESCE(@author, author),
        key_signature = COALESCE(@key_signature, key_signature),
        tempo = COALESCE(@tempo, tempo),
        tags = COALESCE(@tags, tags),
        slides = COALESCE(@slides, slides),
        background_color = COALESCE(@background_color, background_color),
        text_color = COALESCE(@text_color, text_color),
        font_size = COALESCE(@font_size, font_size),
        font_family = COALESCE(@font_family, font_family),
        text_align = COALESCE(@text_align, text_align),
        bg_type = COALESCE(@bg_type, bg_type),
        bg_config = COALESCE(@bg_config, bg_config),
        bg_media_url = COALESCE(@bg_media_url, bg_media_url),
        bg_media_type = COALESCE(@bg_media_type, bg_media_type)
      WHERE id = @id
    `).run({
      id: req.params.id,
      title: title || null,
      author: author !== undefined ? author : null,
      key_signature: key_signature !== undefined ? key_signature : null,
      tempo: tempo || null,
      tags: tags !== undefined ? JSON.stringify(tags) : null,
      slides: slides !== undefined ? JSON.stringify(slides) : null,
      background_color: background_color || null,
      text_color: text_color || null,
      font_size: font_size || null,
      font_family: font_family || null,
      text_align: text_align || null,
      bg_type: bg_type || null,
      bg_config: bg_config !== undefined ? (typeof bg_config === 'object' ? JSON.stringify(bg_config) : bg_config) : null,
      bg_media_url: bg_media_url !== undefined ? bg_media_url : null,
      bg_media_type: bg_media_type !== undefined ? bg_media_type : null,
    });

    const updated = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
    res.json({
      success: true,
      data: { ...updated, slides: JSON.parse(updated.slides), tags: JSON.parse(updated.tags) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE hapus lagu
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM songs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Lagu tidak ditemukan' });

    db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Lagu berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST export database (JSON)
router.post('/export/json', (req, res) => {
  try {
    const songs = db.prepare('SELECT * FROM songs').all();
    const parsed = songs.map(s => ({
      ...s,
      slides: JSON.parse(s.slides || '[]'),
      tags: JSON.parse(s.tags || '[]'),
    }));
    res.json({ success: true, data: parsed, exportedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST import database (JSON)
router.post('/import/json', (req, res) => {
  try {
    const { songs, replace } = req.body;
    if (!Array.isArray(songs)) return res.status(400).json({ success: false, error: 'Format data tidak valid' });

    const insertSong = db.prepare(`
      INSERT INTO songs (title, author, key_signature, tempo, tags, slides, background_color, text_color, font_size, font_family, text_align)
      VALUES (@title, @author, @key_signature, @tempo, @tags, @slides, @background_color, @text_color, @font_size, @font_family, @text_align)
    `);

    const importMany = db.transaction((songList) => {
      if (replace) db.prepare('DELETE FROM songs').run();
      let count = 0;
      for (const song of songList) {
        insertSong.run({
          title: song.title || 'Untitled',
          author: song.author || '',
          key_signature: song.key_signature || '',
          tempo: song.tempo || 120,
          tags: JSON.stringify(song.tags || []),
          slides: JSON.stringify(song.slides || []),
          background_color: song.background_color || '#000000',
          text_color: song.text_color || '#FFFFFF',
          font_size: song.font_size || 48,
          font_family: song.font_family || 'Arial',
          text_align: song.text_align || 'center',
        });
        count++;
      }
      return count;
    });

    const count = importMany(songs);
    res.json({ success: true, message: `${count} lagu berhasil diimpor` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
