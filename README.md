# 🎵 Church Slide Manager

Aplikasi web manajemen slide lagu untuk ibadah gereja — mirip EasyWorship, berbasis web, **gratis dan open source**.

## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| 📋 Manajemen Lagu | CRUD lengkap: judul, penulis, kunci, slide per bait |
| 🎨 Editor Slide | Warna latar/font, ukuran font, rata teks, preset warna |
| 📺 Mode Live | Preview operator + proyektor terpisah (pop-out window) |
| 🔴 Kontrol Real-time | Next/Prev slide via WebSocket tanpa refresh |
| ⬛ Black/Blank Screen | Sembunyikan konten seketika |
| ↕️ Sesi Ibadah | Susun urutan lagu dengan drag & drop |
| ⏱️ Timer | Pencatat waktu sesi |
| 📖 Ayat Alkitab | Simpan & tampilkan ayat ke proyektor |
| 💾 Ekspor/Impor | Backup & restore database lagu (JSON) |
| 🌙 Dark Mode | UI gelap, nyaman untuk ruang remang |

## 🚀 Cara Instalasi

### Persyaratan
- **Node.js** versi 18 atau lebih baru → [nodejs.org](https://nodejs.org)
- Terminal / Command Prompt

### Langkah Instalasi

```bash
# 1. Masuk ke folder proyek
cd church-slide-manager

# 2. Install dependensi server
cd server
npm install

# 3. Install dependensi frontend
cd ../client
npm install

# 4. Kembali ke root
cd ..
```

## ▶️ Cara Menjalankan

### Mode Development (2 terminal)

**Terminal 1 — Server:**
```bash
cd church-slide-manager/server
npm run dev
```
Server berjalan di: `http://localhost:3001`

**Terminal 2 — Frontend:**
```bash
cd church-slide-manager/client
npm run dev
```
Aplikasi buka di: `http://localhost:5173`

### Mode Production (1 perintah)

```bash
# Build frontend dulu
cd church-slide-manager/client
npm run build

# Jalankan server (sudah serve frontend juga)
cd ../server
npm start
```
Buka: `http://localhost:3001`

## 📱 Cara Pakai (Panduan Operator)

### 1. Menambah Lagu
1. Klik menu **Daftar Lagu** di sidebar
2. Klik tombol **+ Tambah Lagu**
3. Isi judul, penulis, dan kunci
4. Di panel kiri, klik **+** untuk tambah slide
5. Ketik lirik di editor tengah
6. Atur warna dan font di panel kanan
7. Klik **Simpan**

### 2. Menyiapkan Sesi Ibadah
1. Klik menu **Sesi Ibadah**
2. Klik **Buat Baru**, isi nama dan tanggal
3. Klik **+ Tambah Lagu** untuk memasukkan lagu
4. Seret (drag) untuk mengubah urutan
5. Klik **Simpan Urutan**

### 3. Tampil Live
1. **Buka proyektor**: Klik tombol **Proyektor** di sidebar → muncul window baru untuk layar kedua
2. Pindahkan window proyektor ke monitor/proyektor eksternal, lalu fullscreen (F11)
3. Klik menu **Live** di sidebar operator
4. Pilih lagu dari daftar → klik langsung
5. Gunakan tombol **← Sebelumnya** / **Berikutnya →** untuk navigasi
6. Tombol **⬛ Layar Hitam**: Sembunyikan tampilan (saat berpindah lagu)
7. Tombol **Stop Live**: Akhiri presentasi

### 4. Menampilkan Ayat Alkitab
1. Klik menu **Alkitab**
2. Isi form: pilih kitab, pasal, ayat, tempelkan teks
3. Klik **Simpan Ayat**
4. Saat ibadah, klik ikon ✈️ di ayat yang ingin ditampilkan

## ⌨️ Pintasan Keyboard (halaman Live)

| Tombol | Fungsi |
|---|---|
| `→` atau `Space` | Slide berikutnya |
| `←` | Slide sebelumnya |
| `B` | Toggle layar hitam |
| `W` | Toggle layar putih |

## 🗂️ Struktur Folder

```
church-slide-manager/
├── server/
│   ├── index.js          # Entry point Express server
│   ├── db.js             # Koneksi & inisialisasi SQLite
│   ├── websocket.js      # WebSocket server (real-time)
│   ├── routes/
│   │   ├── songs.js      # API CRUD lagu
│   │   ├── services.js   # API sesi ibadah
│   │   └── bible.js      # API ayat Alkitab
│   └── data/
│       └── church.db     # File database SQLite (auto-buat)
└── client/
    └── src/
        ├── pages/
        │   ├── LivePage.jsx       # Halaman kontrol live
        │   ├── SongsPage.jsx      # Manajemen lagu
        │   ├── ServicePage.jsx    # Sesi ibadah
        │   ├── BiblePage.jsx      # Ayat Alkitab
        │   └── ProjectorPage.jsx  # Tampilan proyektor
        ├── components/
        │   ├── Layout.jsx         # Shell navigasi
        │   ├── SlidePreview.jsx   # Komponen preview 16:9
        │   ├── SongEditor.jsx     # Editor lagu lengkap
        │   └── ToastContainer.jsx # Notifikasi
        ├── hooks/
        │   └── useWebSocket.js    # Hook WebSocket client
        └── store/
            └── useStore.js        # State global (Zustand)
```

## 🔧 Konfigurasi

### Port Server
Edit `server/index.js` — ubah `PORT`:
```js
const PORT = process.env.PORT || 3001;
```

### Database
Database SQLite otomatis dibuat di `server/data/church.db` saat pertama kali dijalankan.

### Backup Database
Cukup salin file `server/data/church.db` ke tempat lain.

## 📦 Teknologi yang Digunakan

**Backend:**
- Node.js + Express
- better-sqlite3 (database ringan, tanpa server terpisah)
- ws (WebSocket native)

**Frontend:**
- React 18
- Tailwind CSS (styling)
- Framer Motion (animasi slide)
- Zustand (state management)
- @dnd-kit (drag & drop)
- Lucide React (ikon)
