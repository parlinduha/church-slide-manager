const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const db = require('../db');

// ─── Daftar kitab Alkitab ─────────────────────────────────────────────────────
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

// Peta singkatan → nama lengkap untuk URL-encode
const BOOK_ABBREV = {
  'Kej':'Kej','Kel':'Kel','Im':'Im','Bil':'Bil','Ul':'Ul',
  'Yos':'Yos','Hak':'Hak','Rut':'Rut','1Sam':'1Sam','2Sam':'2Sam',
  '1Raj':'1Raj','2Raj':'2Raj','1Taw':'1Taw','2Taw':'2Taw','Ezr':'Ezr',
  'Neh':'Neh','Est':'Est','Ayb':'Ayb','Mzm':'Mzm','Ams':'Ams',
  'Pkh':'Pkh','Kid':'Kid','Yes':'Yes','Yer':'Yer','Rat':'Rat',
  'Yeh':'Yeh','Dan':'Dan','Hos':'Hos','Yoel':'Yoel','Am':'Am',
  'Ob':'Ob','Yun':'Yun','Mi':'Mi','Nah':'Nah','Hab':'Hab',
  'Zef':'Zef','Hag':'Hag','Za':'Za','Mal':'Mal',
  'Mat':'Mat','Mrk':'Mrk','Luk':'Luk','Yoh':'Yoh','Kis':'Kis',
  'Rom':'Rom','1Kor':'1Kor','2Kor':'2Kor','Gal':'Gal','Ef':'Ef',
  'Flp':'Flp','Kol':'Kol','1Tes':'1Tes','2Tes':'2Tes','1Tim':'1Tim',
  '2Tim':'2Tim','Tit':'Tit','Flm':'Flm','Ibr':'Ibr','Yak':'Yak',
  '1Pet':'1Pet','2Pet':'2Pet','1Yoh':'1Yoh','2Yoh':'2Yoh','3Yoh':'3Yoh',
  'Yud':'Yud','Why':'Why',
};

// ─── Helper: Fetch dari SABDA API dengan follow redirect ──────────────────────
function fetchSabda(passage) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(passage);
    const url = `https://alkitab.sabda.org/api/passage.php?passage=${encoded}`;

    https.get(url, { timeout: 10000 }, (res) => {
      // Follow redirect 301/302
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        const loc = res.headers.location;
        const mod = loc.startsWith('https') ? https : http;
        mod.get(loc, { timeout: 10000 }, (res2) => {
          let data = '';
          res2.on('data', chunk => { data += chunk; });
          res2.on('end', () => resolve(data));
          res2.on('error', reject);
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

// ─── Helper: Parse XML response SABDA → array ayat ───────────────────────────
function parseSabdaXml(xml) {
  // Ambil nama kitab dari atribut <book name="...">
  const bookMatch = xml.match(/<book name="([^"]+)"/);
  const bookName = bookMatch ? bookMatch[1] : '';

  // Ambil nomor pasal
  const chapMatch = xml.match(/<chap>(\d+)<\/chap>/);
  const chapter = chapMatch ? parseInt(chapMatch[1]) : 0;

  // Ambil semua ayat
  const verseRegex = /<verse><number>(\d+)<\/number>(?:<title>[^<]*<\/title>)?<text>([\s\S]*?)<\/text><\/verse>/g;
  const verses = [];
  let match;
  while ((match = verseRegex.exec(xml)) !== null) {
    const num = parseInt(match[1]);
    // Bersihkan HTML entities
    const text = match[2]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    verses.push({ book: bookName, chapter, verse: num, text });
  }
  return verses;
}

// ─── GET daftar kitab ─────────────────────────────────────────────────────────
router.get('/books', (req, res) => {
  res.json({ success: true, data: BIBLE_BOOKS });
});

// ─── GET dari SABDA API (proxy) ───────────────────────────────────────────────
// Query params: passage (misal: "Yoh 3:16", "Yoh 3", "Mat 5:3-12")
router.get('/sabda', async (req, res) => {
  try {
    const { passage } = req.query;
    if (!passage) return res.status(400).json({ success: false, error: 'Parameter passage wajib diisi' });

    const xml = await fetchSabda(passage);

    if (!xml.includes('<bible>')) {
      return res.status(404).json({ success: false, error: 'Ayat tidak ditemukan. Coba format lain (contoh: Yoh 3:16, Mat 5)' });
    }

    const verses = parseSabdaXml(xml);
    if (!verses.length) {
      return res.status(404).json({ success: false, error: 'Gagal mem-parsing ayat dari sumber.' });
    }

    // Ambil judul dari XML
    const titleMatch = xml.match(/<bible><title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : passage;

    res.json({ success: true, data: verses, title, source: 'SABDA', translation: 'TB' });
  } catch (err) {
    res.status(500).json({ success: false, error: `Gagal mengambil dari SABDA: ${err.message}` });
  }
});

// ─── GET semua ayat tersimpan ─────────────────────────────────────────────────
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

// ─── GET satu ayat by ID ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const verse = db.prepare('SELECT * FROM bible_verses WHERE id = ?').get(req.params.id);
    if (!verse) return res.status(404).json({ success: false, error: 'Ayat tidak ditemukan' });
    res.json({ success: true, data: verse });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST tambah ayat ─────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { book, chapter, verse, verse_end, text, translation } = req.body;

    if (!book || !chapter || !verse || !text) {
      return res.status(400).json({ success: false, error: 'Kitab, pasal, ayat, dan teks wajib diisi' });
    }

    const result = db.prepare(`
      INSERT INTO bible_verses (book, chapter, verse, verse_end, text, translation)
      VALUES (@book, @chapter, @verse, @verse_end, @text, @translation)
    `).run({
      book, chapter: parseInt(chapter), verse: parseInt(verse),
      verse_end: verse_end ? parseInt(verse_end) : null,
      text, translation: translation || 'TB'
    });

    const newVerse = db.prepare('SELECT * FROM bible_verses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: newVerse });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST simpan banyak ayat sekaligus (dari hasil SABDA) ────────────────────
router.post('/batch', (req, res) => {
  try {
    const { verses, translation } = req.body;
    if (!Array.isArray(verses) || !verses.length) {
      return res.status(400).json({ success: false, error: 'verses harus berupa array' });
    }

    const insert = db.prepare(`
      INSERT INTO bible_verses (book, chapter, verse, text, translation)
      VALUES (@book, @chapter, @verse, @text, @translation)
    `);

    const insertMany = db.transaction((list) => {
      const saved = [];
      for (const v of list) {
        if (!v.book || !v.chapter || !v.verse || !v.text) continue;
        const result = insert.run({
          book: v.book, chapter: parseInt(v.chapter),
          verse: parseInt(v.verse), text: v.text,
          translation: translation || v.translation || 'TB',
        });
        saved.push(result.lastInsertRowid);
      }
      return saved;
    });

    const ids = insertMany(verses);
    res.status(201).json({ success: true, saved: ids.length, message: `${ids.length} ayat berhasil disimpan` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE hapus ayat ────────────────────────────────────────────────────────
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
