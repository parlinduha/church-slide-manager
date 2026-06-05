const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── Simpan & baca settings AI di database ──────────────────────────────────
function ensureSettingsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
ensureSettingsTable();

function getSetting(key, defaultVal = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultVal;
}

function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// GET pengaturan AI (tanpa nilai API key asli — hanya status)
router.get('/settings', (req, res) => {
  const provider = getSetting('ai_provider', 'openai');
  const model    = getSetting('ai_model', '');
  const hasKey   = !!getSetting('ai_api_key', '');
  const ollamaUrl = getSetting('ai_ollama_url', 'http://localhost:11434');
  res.json({ success: true, data: { provider, model, hasKey, ollamaUrl } });
});

// POST simpan pengaturan AI
router.post('/settings', (req, res) => {
  const { provider, model, api_key, ollama_url } = req.body;
  if (provider) setSetting('ai_provider', provider);
  if (model)    setSetting('ai_model', model);
  if (api_key)  setSetting('ai_api_key', api_key);
  if (ollama_url) setSetting('ai_ollama_url', ollama_url);
  res.json({ success: true, message: 'Pengaturan AI disimpan' });
});

// ─── Helper: panggil provider AI ────────────────────────────────────────────
async function callAI(prompt) {
  const provider  = getSetting('ai_provider', 'openai');
  const apiKey    = getSetting('ai_api_key', '');
  const model     = getSetting('ai_model', '');
  const ollamaUrl = getSetting('ai_ollama_url', 'http://localhost:11434');

  if (provider === 'openai') {
    if (!apiKey) throw new Error('API key OpenAI belum diatur. Buka menu Pengaturan AI.');
    const mdl = model || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: mdl,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'gemini') {
    if (!apiKey) throw new Error('API key Gemini belum diatur. Buka menu Pengaturan AI.');
    const mdl = model || 'gemini-1.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini error ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (provider === 'ollama') {
    const mdl = model || 'llama3';
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: mdl, prompt, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}. Pastikan Ollama berjalan.`);
    const data = await res.json();
    return data.response || '';
  }

  throw new Error(`Provider "${provider}" tidak dikenal.`);
}

// ─── Helper: parse JSON dari respons AI (toleran terhadap markdown fence) ───
function parseJSON(text) {
  // Hilangkan markdown code fence jika ada
  const clean = text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

// ─── POST: Cari lirik lagu ───────────────────────────────────────────────────
// Body: { title, author?, language? }
// Response: { slides: [{id, label, content}], author, key_signature, tags }
router.post('/lyrics', async (req, res) => {
  try {
    const { title, author = '', language = 'id' } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Judul lagu wajib diisi' });

    const langHint = language === 'id' ? 'Bahasa Indonesia' : language === 'en' ? 'English' : language;
    const authorHint = author ? `, penulis: ${author}` : '';

    const prompt = `Kamu adalah asisten pengurus ibadah gereja.
Tugasmu: berikan lirik lengkap lagu "${title}"${authorHint} dalam ${langHint}.
Bagi lirik menjadi slide-slide (setiap bait/chorus/bridge = 1-2 slide, maks 4 baris per slide).
Kembalikan HANYA JSON valid (tanpa penjelasan, tanpa markdown) dengan format:
{
  "title": "judul lagu",
  "author": "nama penulis",
  "key_signature": "kunci dasar (misal: G, C, D)",
  "tags": ["Pujian"],
  "slides": [
    { "id": "s1", "label": "Verse 1", "content": "baris1\\nbaris2\\nbaris3" },
    { "id": "s2", "label": "Chorus", "content": "baris1\\nbaris2" }
  ]
}
Pastikan content menggunakan \\n sebagai pemisah baris, bukan newline literal.
Jika lagu tidak diketahui, kembalikan slides kosong [].`;

    const raw = await callAI(prompt);
    const result = parseJSON(raw);

    if (!result.slides || !Array.isArray(result.slides)) {
      throw new Error('Respons AI tidak valid');
    }

    // Normalisasi ID slide
    result.slides = result.slides.map((s, i) => ({
      id: s.id || `ai-s${i + 1}`,
      label: s.label || `Slide ${i + 1}`,
      content: s.content || '',
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST: Cari ayat Alkitab ─────────────────────────────────────────────────
// Body: { query, translation? }
// query contoh: "Yohanes 3:16" atau "ayat tentang kasih" atau "Mazmur 23"
// Response: { verses: [{book, chapter, verse, verse_end?, text, reference}] }
router.post('/bible', async (req, res) => {
  try {
    const { query, translation = 'TB' } = req.body;
    if (!query) return res.status(400).json({ success: false, error: 'Query wajib diisi' });

    const transMap = {
      TB: 'Terjemahan Baru (Indonesia)',
      BIS: 'Bahasa Indonesia Sehari-hari',
      KJV: 'King James Version (English)',
      NIV: 'New International Version (English)',
    };
    const transLabel = transMap[translation] || translation;

    const prompt = `Kamu adalah asisten pengurus ibadah gereja yang hafal Alkitab.
Pengguna mencari: "${query}"
Terjemahan yang diminta: ${transLabel}

Kembalikan HANYA JSON valid (tanpa penjelasan, tanpa markdown) dengan format:
{
  "verses": [
    {
      "book": "nama kitab dalam Bahasa Indonesia (misal: Yohanes, Mazmur, Roma)",
      "chapter": 3,
      "verse": 16,
      "verse_end": null,
      "text": "teks ayat sesuai terjemahan ${transLabel}",
      "reference": "Yohanes 3:16"
    }
  ]
}
- Jika query adalah referensi spesifik (Yohanes 3:16), berikan 1 ayat itu.
- Jika query range (Mazmur 23:1-3), berikan semua ayatnya sebagai item terpisah.
- Jika query tematik ("ayat tentang kasih"), berikan 3-5 ayat paling relevan.
- verse_end diisi hanya untuk range ayat dalam 1 item (misal ayat 1-6 disatukan).
- Pastikan teks ayat akurat sesuai terjemahan yang diminta.
- Jika tidak yakin, kembalikan verses kosong [].`;

    const raw = await callAI(prompt);
    const result = parseJSON(raw);

    if (!result.verses || !Array.isArray(result.verses)) {
      throw new Error('Respons AI tidak valid');
    }

    res.json({ success: true, data: result.verses, query });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET: Test koneksi AI ─────────────────────────────────────────────────────
router.get('/test', async (req, res) => {
  try {
    const reply = await callAI('Balas dengan teks: "OK" saja, tanpa penjelasan lain.');
    res.json({ success: true, message: `Koneksi AI berhasil. Respons: ${reply.trim()}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
