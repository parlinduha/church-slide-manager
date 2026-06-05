const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

const songRoutes = require('./routes/songs');
const serviceRoutes = require('./routes/services');
const bibleRoutes = require('./routes/bible');
const aiRoutes = require('./routes/ai');
const welcomeRoutes = require('./routes/welcome');
const { createWebSocketServer, getLiveState } = require('./websocket');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes API
app.use('/api/songs', songRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bible', bibleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/welcome', welcomeRoutes);

// GET live state via HTTP (fallback)
app.get('/api/live/state', (req, res) => {
  res.json({ success: true, data: getLiveState() });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Church Slide Manager API berjalan', version: '1.0.0' });
});

// Serve static frontend (production)
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'Frontend belum di-build. Jalankan: cd client && npm run build' });
  }
});

// Inisialisasi WebSocket
createWebSocketServer(server);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🎵  Church Slide Manager  🎵            ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  API Server  : http://localhost:${PORT}       ║`);
  console.log(`║  WebSocket   : ws://localhost:${PORT}/ws      ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
