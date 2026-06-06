const express = require('express');
const router = express.Router();
const https = require('https');
const db = require('../db');

// ─── Settings helpers ─────────────────────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);

const getSetting  = (k, d = '') => { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(k); return r ? r.value : d; };
const setSetting  = (k, v)      => db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run(k, v);

// ─── Provider config ──────────────────────────────────────────────────────────
const PROVIDERS = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (model, messages, temp) => ({ model, messages, temperature: temp }),
    extractText: (data) => data.choices?.[0]?.message?.content || '',
  },
  deepseek: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (model, messages, temp) => ({ model, messages, temperature: temp }),
    extractText: (data) => data.choices?.[0]?.message?.content || '',
  },
  groq: {
    // Groq: gratis, sangat cepat (Llama3, Mixtral)
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama3-8b-8192',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    buildBody: (model, messages, temp) => ({ model, messages, temperature: temp }),
    extractText: (data) => data.choices?.[0]?.message?.content || '',
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-haiku-20240307',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    buildBody: (model, messages, temp) => ({
      model, max_tokens: 4096, temperature: temp,
      messages: messages.filter(m => m.role !== 'system'),
      system: messages.find(m => m.role === 'system')?.content,
    }),
    extractText: (data) => data.content?.[0]?.text || '',
  },
  gemini: {
    // Handled separately karena format API berbeda
    defaultModel: 'gemini-1.5-flash',
  },
  ollama: {
    defaultModel: 'llama3',
  },
};

// ─── Core AI caller ───────────────────────────────────────────────────────────
async function callAI(prompt, { temperature = 0.2 } = {}) {
  const provider  = getSetting('ai_provider', 'openai');
  const apiKey    = getSetting('ai_api_key', '');
  const model     = getSetting('ai_model', '') || PROVIDERS[provider]?.defaultModel || '';
  const ollamaUrl = getSetting('ai_ollama_url', 'http://localhost:11434');

  const messages = [
    {
      role: 'system',
      content: 'Kamu adalah asisten ibadah gereja yang sangat teliti dan akurat. Selalu kembalikan JSON valid tanpa penjelasan tambahan.',
    },
    { role: 'user', content: prompt },
  ];

  // ── OpenAI-compatible providers (OpenAI, DeepSeek, Groq) ──────────────────
  const cfg = PROVIDERS[provider];
  if (cfg && cfg.endpoint) {
    if (!apiKey) throw new Error(`API key ${provider} belum diatur. Buka Pengaturan AI.`);

    const body = cfg.buildBody(model, messages, temperature);
    const res  = await fetchJson(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...cfg.authHeader(apiKey) },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = res.data?.error?.message || res.data?.message || `HTTP ${res.status}`;
      throw new Error(`${provider} error: ${err}`);
    }
    return cfg.extractText(res.data);
  }

  // ── Gemini ────────────────────────────────────────────────────────────────
  if (provider === 'gemini') {
    if (!apiKey) throw new Error('API key Gemini belum diatur. Buka Pengaturan AI.');
    const mdl = model || 'gemini-1.5-flash';
    const res = await fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) {
      throw new Error(`Gemini error: ${res.data?.error?.message || `HTTP ${res.status}`}`);
    }
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // ── Ollama (local) ────────────────────────────────────────────────────────
  if (provider === 'ollama') {
    const mdl = model || 'llama3';
    const res = await fetchJson(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: mdl, prompt, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}. Pastikan Ollama berjalan di ${ollamaUrl}`);
    return res.data.response || '';
  }

  throw new Error(`Provider "${provider}" tidak dikenal.`);
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function fetchJson(url, options) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const mod    = urlObj.protocol === 'https:' ? https : require('http');
    const reqOpts = {
      hostname: urlObj.hostname,
      port:     urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path:     urlObj.pathname + urlObj.search,
      method:   options.method || 'GET',
      headers:  options.headers || {},
      timeout:  30000,
    };
    const req = mod.request(reqOpts, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ ok: false, status: res.statusCode, data: { message: raw.slice(0, 200) } });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, data: { message: e.message } }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, data: { message: 'Request timeout' } }); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─── JSON parser toleran — handle berbagai format output AI ──────────────────
function parseJSON(text) {
  // Coba parse langsung dulu
  try { return JSON.parse(text); } catch {}

  // 1. Hilangkan markdown code fence
  let clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // 2. Cari blok JSON (dari '{' pertama ke '}' terakhir)
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    clean = clean.slice(start, end + 1);
  }

  // 3. Coba parse setelah cleaning
  try { return JSON.parse(clean); } catch {}

  // 4. Fix: AI kadang menaruh newline literal di dalam value string JSON
  // Contoh: "content": "baris1
  //                      baris2"  ← ini invalid JSON
  // Ganti newline di dalam string value menjadi \n
  const fixed = clean.replace(/"([^"]*?)"/g, (match, inner) => {
    // Escape newlines dan tab di dalam string
    const escaped = inner
      .replace(/\\/g, '\\\\')   // escape backslash dulu
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    // Kembalikan ke bentuk semula jika double-escape terjadi
    return `"${escaped.replace(/\\\\\\/g, '\\\\')}"`;
  });

  try { return JSON.parse(fixed); } catch {}

  // 5. Last resort: coba evaluasi dengan lebih agresif
  // Hapus trailing comma sebelum } atau ]
  const noTrailing = clean
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');
  return JSON.parse(noTrailing);
}

// ─── GET settings ─────────────────────────────────────────────────────────────
router.get('/settings', (req, res) => {
  res.json({
    success: true,
    data: {
      provider:   getSetting('ai_provider', 'openai'),
      model:      getSetting('ai_model', ''),
      hasKey:     !!getSetting('ai_api_key', ''),
      ollamaUrl:  getSetting('ai_ollama_url', 'http://localhost:11434'),
    },
  });
});

// ─── POST settings ────────────────────────────────────────────────────────────
router.post('/settings', (req, res) => {
  const { provider, model, api_key, ollama_url } = req.body;
  if (provider)   setSetting('ai_provider', provider);
  if (api_key)    setSetting('ai_api_key', api_key);
  if (ollama_url) setSetting('ai_ollama_url', ollama_url);

  // Simpan model — jika kosong, hapus agar fallback ke default provider
  if (model !== undefined) {
    if (model.trim()) {
      setSetting('ai_model', model.trim());
    } else {
      // Model dikosongkan → hapus agar pakai default
      db.prepare("DELETE FROM settings WHERE key='ai_model'").run();
    }
  }

  // Validasi: jika model tidak sesuai provider yang dipilih, reset ke default
  const savedProvider = getSetting('ai_provider', 'openai');
  const savedModel    = getSetting('ai_model', '');
  const providerDefault = PROVIDERS[savedProvider]?.defaultModel || '';

  // Deteksi model dari provider lain yang tidak kompatibel
  const modelMismatch = (
    (savedProvider === 'openai'    && savedModel && !savedModel.startsWith('gpt') && !savedModel.startsWith('o1') && !savedModel.startsWith('o3')) ||
    (savedProvider === 'deepseek'  && savedModel && !savedModel.startsWith('deepseek')) ||
    (savedProvider === 'groq'      && savedModel && savedModel.startsWith('gpt')) ||
    (savedProvider === 'anthropic' && savedModel && !savedModel.startsWith('claude')) ||
    (savedProvider === 'gemini'    && savedModel && !savedModel.startsWith('gemini'))
  );

  if (modelMismatch) {
    setSetting('ai_model', providerDefault);
  }

  res.json({ success: true, message: 'Pengaturan AI disimpan' });
});

// ─── POST /lyrics ─────────────────────────────────────────────────────────────
router.post('/lyrics', async (req, res) => {
  try {
    const { title, author = '' } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Judul lagu wajib diisi' });

    const authorHint = author ? ` oleh ${author}` : '';

    const prompt = `Kamu adalah database lirik lagu rohani Kristen yang sangat akurat.

TUGAS: Berikan lirik LENGKAP dan AKURAT lagu "${title}"${authorHint}.

ATURAN PENTING:
1. Tulis lirik PERSIS seperti aslinya — jangan parafrase, jangan ubah kata apapun.
2. Deteksi bahasa secara otomatis dari judul lagu (Indonesia atau Inggris).
3. Pisahkan setiap bagian (Verse 1, Verse 2, Pre-Chorus, Chorus, Bridge, Outro) menjadi slide terpisah.
4. Maksimal 4 baris per slide. Jika bait punya 8 baris, bagi menjadi 2 slide.
5. JANGAN tambahkan keterangan "(ulangi)", "[Chorus]", atau penjelasan apapun di dalam content.

FORMAT RESPONS — kembalikan HANYA JSON ini, tanpa teks penjelasan apapun:
{
  "title": "judul asli lagu",
  "author": "nama penulis/penyanyi",
  "key_signature": "kunci dasar",
  "tags": ["kategori"],
  "slides": [
    { "id": "v1", "label": "Verse 1", "content": "baris 1\nbaris 2\nbaris 3\nbaris 4" },
    { "id": "c1", "label": "Chorus", "content": "baris 1\nbaris 2\nbaris 3" }
  ]
}

PENTING: gunakan newline biasa (\\n) di dalam content, bukan literal backslash-n.
Jika lagu tidak diketahui, kembalikan: {"title":"${title}","slides":[]}`;

    const raw    = await callAI(prompt, { temperature: 0.1 });
    const result = parseJSON(raw);

    if (!Array.isArray(result.slides)) throw new Error('Respons AI tidak valid');

    result.slides = result.slides.map((s, i) => ({
      id:      s.id      || `s${i + 1}`,
      label:   s.label   || `Slide ${i + 1}`,
      content: (s.content || '').replace(/\\n/g, '\n').trim(),
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /lyrics/correct  (koreksi lirik yang kurang tepat) ─────────────────
router.post('/lyrics/correct', async (req, res) => {
  try {
    const { title, author = '', slides = [], feedback = '' } = req.body;
    if (!slides.length) return res.status(400).json({ success: false, error: 'Slides tidak boleh kosong' });

    const currentLyrics = slides.map((s, i) =>
      `[${s.label || `Slide ${i+1}`}]\n${s.content}`
    ).join('\n\n');

    const prompt = `Kamu adalah editor lirik lagu rohani yang sangat teliti.

Lagu: "${title}"${author ? ` oleh ${author}` : ''}

LIRIK SAAT INI (mungkin ada kesalahan):
${currentLyrics}

${feedback ? `CATATAN DARI PENGGUNA: ${feedback}` : ''}

TUGAS:
1. Periksa dan koreksi setiap kata yang salah, kurang tepat, atau tidak sesuai dengan lirik aslinya.
2. Pastikan urutan slide sudah benar (Verse 1 → Pre-Chorus → Chorus → Verse 2 → dst).
3. Jangan ubah struktur slide jika sudah benar, hanya koreksi teks yang salah.
4. Pertahankan jumlah slide yang sama kecuali ada slide yang jelas tidak masuk akal.

Kembalikan HANYA JSON dengan format SAMA seperti input:
{
  "title": "judul",
  "author": "penulis",
  "key_signature": "kunci",
  "tags": [],
  "slides": [
    { "id": "...", "label": "...", "content": "baris1\\nbaris2" }
  ],
  "corrections": ["deskripsi koreksi 1", "deskripsi koreksi 2"]
}`;

    const raw    = await callAI(prompt, { temperature: 0.1 });
    const result = parseJSON(raw);

    if (!Array.isArray(result.slides)) throw new Error('Respons AI tidak valid');
    result.slides = result.slides.map((s, i) => ({
      id:      s.id      || `s${i + 1}`,
      label:   s.label   || `Slide ${i + 1}`,
      content: (s.content || '').replace(/\\n/g, '\n'),
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /bible ──────────────────────────────────────────────────────────────
router.post('/bible', async (req, res) => {
  try {
    const { query, translation = 'TB' } = req.body;
    if (!query) return res.status(400).json({ success: false, error: 'Query wajib diisi' });

    const transMap = {
      TB: 'Alkitab Terjemahan Baru LAI (Indonesia)',
      BIS: 'Bahasa Indonesia Sehari-hari',
      KJV: 'King James Version (English)',
      NIV: 'New International Version (English)',
    };

    const prompt = `Kamu adalah pakar Alkitab yang hafal teks ayat dengan akurat.

Pencarian: "${query}"
Terjemahan: ${transMap[translation] || translation}

ATURAN:
- Kutip teks ayat PERSIS sesuai terjemahan yang diminta, jangan parafrase.
- Untuk TB (Terjemahan Baru), gunakan teks LAI yang standar.
- Nama kitab dalam Bahasa Indonesia (Yohanes bukan John, Mazmur bukan Psalm).

Kembalikan HANYA JSON:
{
  "verses": [
    { "book": "Yohanes", "chapter": 3, "verse": 16, "verse_end": null, "text": "teks ayat tepat" }
  ]
}`;

    const raw    = await callAI(prompt, { temperature: 0.1 });
    const result = parseJSON(raw);

    if (!Array.isArray(result.verses)) throw new Error('Respons AI tidak valid');
    res.json({ success: true, data: result.verses, query });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /test ────────────────────────────────────────────────────────────────
router.get('/test', async (req, res) => {
  try {
    const provider = getSetting('ai_provider', 'openai');
    const model    = getSetting('ai_model', '') || PROVIDERS[provider]?.defaultModel || '-';
    const reply    = await callAI('Balas hanya dengan kata "OK".', { temperature: 0 });
    res.json({
      success: true,
      message: `✓ Koneksi berhasil ke ${provider} (${model}). Respons: "${reply.trim()}"`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
