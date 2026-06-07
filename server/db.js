const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// DATA_DIR: di-set oleh Electron main process lewat env, atau fallback ke ./data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'church.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Aktifkan WAL mode untuk performa lebih baik
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Inisialisasi schema database
function initDatabase() {
  db.exec(`
    -- Tabel lagu
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      key_signature TEXT DEFAULT '',
      tempo INTEGER DEFAULT 120,
      tags TEXT DEFAULT '[]',
      slides TEXT NOT NULL DEFAULT '[]',
      background_color TEXT DEFAULT '#000000',
      text_color TEXT DEFAULT '#FFFFFF',
      font_size INTEGER DEFAULT 48,
      font_family TEXT DEFAULT 'Arial',
      text_align TEXT DEFAULT 'center',
      bg_type TEXT DEFAULT 'solid',
      bg_config TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabel sesi ibadah
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabel ayat Alkitab
    CREATE TABLE IF NOT EXISTS bible_verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      verse_end INTEGER,
      text TEXT NOT NULL,
      translation TEXT DEFAULT 'TB',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Trigger update timestamp lagu
    CREATE TRIGGER IF NOT EXISTS update_songs_timestamp
      AFTER UPDATE ON songs
    BEGIN
      UPDATE songs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- Trigger update timestamp sesi
    CREATE TRIGGER IF NOT EXISTS update_services_timestamp
      AFTER UPDATE ON services
    BEGIN
      UPDATE services SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  // Seed data contoh jika database kosong
  const songCount = db.prepare('SELECT COUNT(*) as count FROM songs').get();
  if (songCount.count === 0) {
    seedSampleData();
  }
}

function seedSampleData() {
  const insertSong = db.prepare(`
    INSERT INTO songs (title, author, key_signature, slides, tags)
    VALUES (@title, @author, @key_signature, @slides, @tags)
  `);

  const sampleSongs = [
    {
      title: 'Amazing Grace',
      author: 'John Newton',
      key_signature: 'G',
      tags: JSON.stringify(['Pujian', 'Klasik']),
      slides: JSON.stringify([
        { id: 's1', label: 'Bait 1', content: 'Amazing grace! How sweet the sound\nThat saved a wretch like me!' },
        { id: 's2', label: 'Bait 1 (lanjut)', content: 'I once was lost, but now am found,\nWas blind, but now I see.' },
        { id: 's3', label: 'Bait 2', content: "'Twas grace that taught my heart to fear,\nAnd grace my fears relieved;" },
        { id: 's4', label: 'Bait 2 (lanjut)', content: 'How precious did that grace appear\nThe hour I first believed.' },
        { id: 's5', label: 'Reff', content: 'Amazing grace! Amazing grace!\nHow sweet the sound.' },
      ])
    },
    {
      title: 'Bapa Engkau Sungguh Baik',
      author: 'Franky Sihombing',
      key_signature: 'C',
      tags: JSON.stringify(['Penyembahan', 'Indonesia']),
      slides: JSON.stringify([
        { id: 's1', label: 'Verse 1', content: 'Bapa Engkau sungguh baik\nKasih-Mu melimpah di hidupku' },
        { id: 's2', label: 'Verse 1 (lanjut)', content: 'Bapa Engkau sungguh baik\nSelalu terus menerus' },
        { id: 's3', label: 'Chorus', content: 'Ku bersyukur, ku bersyukur\nAtas segala yang Engkau berikan' },
        { id: 's4', label: 'Chorus (lanjut)', content: 'Ku bersyukur, ku bersyukur\nTuhan Yesus ku mengasihiMu' },
      ])
    },
    {
      title: 'Betapa Kita Tidak Bersyukur',
      author: 'Tradisional',
      key_signature: 'D',
      tags: JSON.stringify(['Syukur', 'Nasional']),
      slides: JSON.stringify([
        { id: 's1', label: 'Bait 1', content: 'Betapa kita tidak bersyukur\nBertanah air kaya dan subur' },
        { id: 's2', label: 'Bait 1 (lanjut)', content: 'Lautnya luas, gunungnya megah\nMemberikan kita ketenangan jiwa' },
        { id: 's3', label: 'Reff', content: 'Syukurlah, syukurlah\nSyukurlah, syukurlah' },
      ])
    }
  ];

  for (const song of sampleSongs) {
    insertSong.run(song);
  }

  // Sample service
  const songs = db.prepare('SELECT id FROM songs').all();
  if (songs.length > 0) {
    db.prepare(`
      INSERT INTO services (name, date, items) VALUES (?, ?, ?)
    `).run(
      'Ibadah Minggu Pagi',
      new Date().toISOString().split('T')[0],
      JSON.stringify(songs.map((s, i) => ({ id: `item-${i}`, type: 'song', songId: s.id, order: i })))
    );
  }
}

initDatabase();

// ─── Migration: tambah kolom baru jika belum ada (untuk database lama) ────────
function runMigrations() {
  const cols = db.prepare("PRAGMA table_info(songs)").all().map(c => c.name);
  if (!cols.includes('bg_type')) {
    db.exec("ALTER TABLE songs ADD COLUMN bg_type TEXT DEFAULT 'solid'");
  }
  if (!cols.includes('bg_config')) {
    db.exec("ALTER TABLE songs ADD COLUMN bg_config TEXT DEFAULT '{}'");
  }
}
runMigrations();

module.exports = db;
