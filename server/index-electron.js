/**
 * Entry point server untuk Electron.
 * Semua dependensi (express, better-sqlite3, dll) di-require dari root node_modules
 * yang dikelola electron-builder — sehingga native binary (.node) di-rebuild
 * untuk arsitektur yang tepat (arm64 / x64) saat build.
 */
const http = require('http');
const path = require('path');
const fs   = require('fs');

// ── Modul dependencies dari root node_modules (bukan server/node_modules) ─────
// Saat dijalankan dari dalam Electron asar, require() sudah resolve ke root
const express = require('express');
const cors    = require('cors');

// ── Path server source files ───────────────────────────────────────────────────
// SERVER_ROOT di-set oleh electron/main.js
const SERVER_ROOT = process.env.SERVER_ROOT || __dirname;

// ── Data dir ───────────────────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(SERVER_ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
process.env.DATA_DIR = DATA_DIR;

// ── Load routes ────────────────────────────────────────────────────────────────
const songRoutes    = require(path.join(SERVER_ROOT, 'routes/songs'));
const serviceRoutes = require(path.join(SERVER_ROOT, 'routes/services'));
const bibleRoutes   = require(path.join(SERVER_ROOT, 'routes/bible'));
const aiRoutes      = require(path.join(SERVER_ROOT, 'routes/ai'));
const welcomeRoutes = require(path.join(SERVER_ROOT, 'routes/welcome'));
const { createWebSocketServer, getLiveState } = require(path.join(SERVER_ROOT, 'websocket'));

const app    = express();
const server = http.createServer(app);
const PORT   = parseInt(process.env.PORT || '3941');

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Static frontend ────────────────────────────────────────────────────────────
// Di production: ada di Resources/client/dist (extraResources)
// Di development: ada di ../client/dist
const clientDistPath = process.env.CLIENT_DIST
  || (process.resourcesPath
      ? path.join(process.resourcesPath, 'client/dist')
      : path.join(SERVER_ROOT, '../client/dist'));

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/songs',    songRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bible',    bibleRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/welcome',  welcomeRoutes);

app.get('/api/live/state', (_req, res) =>
  res.json({ success: true, data: getLiveState() }));

app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'OK', version: '1.0.0', mode: 'electron' }));

app.get('*', (_req, res) => {
  const index = path.join(clientDistPath, 'index.html');
  fs.existsSync(index) ? res.sendFile(index) : res.status(404).send('Frontend tidak ditemukan');
});

createWebSocketServer(server);

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Electron Server] http://127.0.0.1:${PORT}`);
});

module.exports = { app, server };
