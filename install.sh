#!/bin/bash
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   🎵  Church Slide Manager               ║"
echo "║       Instalasi Otomatis                 ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Cek Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js tidak ditemukan!"
  echo "   Unduh dari: https://nodejs.org (pilih versi LTS)"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "⚠️  Node.js versi $NODE_VERSION terdeteksi. Dibutuhkan versi 18+."
  echo "   Unduh dari: https://nodejs.org"
  exit 1
fi

echo "✅ Node.js $(node -v) terdeteksi"
echo ""

echo "📦 Menginstal dependensi server..."
cd server && npm install --silent
cd ..
echo "✅ Server siap"

echo ""
echo "📦 Menginstal dependensi frontend..."
cd client && npm install --silent
cd ..
echo "✅ Frontend siap"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅  Instalasi selesai!                   ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Untuk menjalankan:                       ║"
echo "║  1. Terminal 1: cd server && npm run dev  ║"
echo "║  2. Terminal 2: cd client && npm run dev  ║"
echo "║  3. Buka: http://localhost:5173           ║"
echo "╚══════════════════════════════════════════╝"
echo ""
