# 🔨 Panduan Build Aplikasi Desktop

## Prasyarat

- Node.js 18+ (sudah terinstall)
- macOS: Xcode Command Line Tools → `xcode-select --install`
- Windows: tidak perlu tambahan apa-apa
- Untuk build `.icns` (ikon macOS): install `icnsutils` atau gunakan script di bawah

---

## Menjalankan sebagai Aplikasi Desktop (Development)

```bash
cd church-slide-manager
npm run electron:dev
```

Ini akan:
1. Build React frontend ke `client/dist/`
2. Buka aplikasi Electron dengan server internal

---

## Build Distribusi

### macOS (.dmg)
```bash
cd church-slide-manager
npm run dist:mac
```
Output: `dist-electron/Church Slide Manager-1.0.0.dmg`

### Windows (.exe installer + portable)
```bash
cd church-slide-manager
npm run dist:win
```
Output: `dist-electron/Church Slide Manager Setup 1.0.0.exe`

### Keduanya sekaligus (dari macOS)
```bash
npm run dist:all
```

---

## Membuat Ikon yang Proper

### macOS (.icns) — dari PNG 1024x1024
```bash
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o electron/assets/icon.icns
```

### Windows (.ico) — gunakan ImageMagick
```bash
magick icon.png -resize 256x256 electron/assets/icon.ico
```

---

## Struktur Data User

Data disimpan di lokasi OS yang aman, tidak di dalam bundle:

| OS      | Lokasi |
|---------|--------|
| macOS   | `~/Library/Application Support/church-slide-manager/data/` |
| Windows | `C:\Users\<nama>\AppData\Roaming\church-slide-manager\data\` |

Database (`church.db`) dan upload media (`uploads/`) ada di sana.
**Data tidak hilang saat update aplikasi.**

---

## Arsitektur Electron

```
Electron Process
├── Main Process (Node.js)
│   ├── Menjalankan Express + WebSocket di port 3941 (localhost only)
│   ├── Membuka BrowserWindow untuk operator (ukuran 1440x900)
│   ├── Membuka BrowserWindow proyektor (fullscreen di layar ke-2)
│   └── IPC: get-displays, open-projector, close-projector
│
└── Renderer Process (Chromium)
    └── Load React dari http://127.0.0.1:3941
        └── WebSocket ke ws://127.0.0.1:3941/ws
```

Port 3941 hanya diakses dari localhost — tidak bisa diakses dari jaringan luar.
