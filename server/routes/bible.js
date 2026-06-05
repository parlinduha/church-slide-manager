const express = require('express');
const router = express.Router();
const db = require('../db');

// Daftar kitab Alkitab
const BIBLE_BOOKS = [
  'Kejadian', 'Keluaran', 'Imamat', 'Bilangan', 'Ulangan',
  'Yosua', 'Hakim-hakim', 'Rut', '1 Samuel', '2 Samuel',
  '1 Raja-raja', '2 Raja-raja', '1 Tawarikh', '2 Tawarikh', 'Ezra',
  'Nehemia', 'Ester', 'Ayub', 'Mazmur', 'Amsal',
  'Pengkhotbah', 'Kidung Agung', 'Yesaya', 'Yeremia', 'Ratapan',
  'Yehezkiel', 'Daniel', 'Hosea', 'Yoel', 'Amos',
  'Obaja', 'Yunus', 'Mikha', 'Nahum', 'Habakuk',
  'Zefanya', 'Hagai', 'Zakharia', 'Maleakhi',
  'Matius', 'Markus', 'Lukas', 'Yohanes', 'Kisah Para Rasul',
  'Roma', '1 Korintus', '2 Korintus', 'Galatia', 'Efesus',
  'Filipi', 'Kolose', '1 Tesalonika', '2 Tesalonika', '1 Timotius',
  '2 Timotius', 'Titus', 'Filemon', 'Ibrani', 'Yakobus',
  '1 Petrus', '2 Petrus', '1 Yohanes', '2 Yohanes', '3 Yohanes',
  'Yudas', 'Wahyu'
];

// GET daftar kitab
router.get('/books', (req, res) => {
  res.json({ success: true, data: BIBLE_BOOKS });
});

// GET semua ayat tersimpan
router.get('/', (req, res) => {
  try {
    const { book, chapter } = req.query;
    let query = 'SELECT * FROM bible_verses';
    const params = [];

    if (book) {
      query += ' WHERE book = ?';
      params.push(book);
      if (chapter) {
        query += ' AND chapter = ?';
        params.push(parseInt(chapter));
      }
    }

    query += ' ORDER BY book, chapter, verse';
    const verses = db.prepare(query).all(...params);
    res.json({ success: true, data: verses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET satu ayat by ID
router.get('/:id', (req, res) => {
  try {
    const verse = db.prepare('SELECT * FROM bible_verses WHERE id = ?').get(req.params.id);
    if (!verse) return res.status(404).json({ success: false, error: 'Ayat tidak ditemukan' });
    res.json({ success: true, data: verse });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST tambah ayat
router.post('/', (req, res) => {
  try {
    const { book, chapter, verse, verse_end, text, translation } = req.body;

    if (!book || !chapter || !verse || !text) {
      return res.status(400).json({ success: false, error: 'Kitab, pasal, ayat, dan teks wajib diisi' });
    }

    const result = db.prepare(`
      INSERT INTO bible_verses (book, chapter, verse, verse_end, text, translation)
      VALUES (@book, @chapter, @verse, @verse_end, @text, @translation)
    `).run({ book, chapter: parseInt(chapter), verse: parseInt(verse), verse_end: verse_end ? parseInt(verse_end) : null, text, translation: translation || 'TB' });

    const newVerse = db.prepare('SELECT * FROM bible_verses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: newVerse });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE hapus ayat
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM bible_verses WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Ayat tidak ditemukan' });

    db.prepare('DELETE FROM bible_verses WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Ayat berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
