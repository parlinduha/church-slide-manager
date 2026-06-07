const WebSocket = require('ws');

let wss = null;

// State live presentation
let liveState = {
  isLive: false,
  mode: 'idle',           // 'idle' | 'welcome' | 'song'
  currentSongId: null,
  currentSlideIndex: 0,
  isBlackScreen: false,
  isBlankScreen: false,
  slides: [],
  songTitle: '',
  songSettings: {
    background_color: '#000000',
    text_color: '#FFFFFF',
    font_size: 48,
    font_family: 'Arial',
    text_align: 'center',
    bg_type: 'solid',
    bg_config: {},
  },
  // Welcome mode
  welcomeSlide: null,     // objek slide welcome yang sedang tampil
  serviceId: null,
  serviceItemIndex: 0,
};

function createWebSocketServer(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('📡 Client WebSocket terhubung');
    ws.send(JSON.stringify({ type: 'STATE_SYNC', payload: liveState }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(data, ws);
      } catch (err) {
        console.error('WS parse error:', err.message);
      }
    });

    ws.on('close', () => console.log('📡 Client WebSocket terputus'));
    ws.on('error', (err) => console.error('WS error:', err.message));
  });

  console.log('🔌 WebSocket server siap');
  return wss;
}

function handleMessage(data, senderWs) {
  const { type, payload } = data;

  switch (type) {
    case 'GOTO_SLIDE':
      liveState.currentSlideIndex = payload.index;
      liveState.isBlackScreen = false;
      liveState.isBlankScreen = false;
      broadcast({ type: 'SLIDE_CHANGED', payload: { index: liveState.currentSlideIndex } });
      break;

    case 'NEXT_SLIDE':
      if (liveState.currentSlideIndex < liveState.slides.length - 1) {
        liveState.currentSlideIndex++;
        liveState.isBlackScreen = false;
        liveState.isBlankScreen = false;
        broadcast({ type: 'SLIDE_CHANGED', payload: { index: liveState.currentSlideIndex } });
      }
      break;

    case 'PREV_SLIDE':
      if (liveState.currentSlideIndex > 0) {
        liveState.currentSlideIndex--;
        liveState.isBlackScreen = false;
        liveState.isBlankScreen = false;
        broadcast({ type: 'SLIDE_CHANGED', payload: { index: liveState.currentSlideIndex } });
      }
      break;

    case 'TOGGLE_BLACK':
      liveState.isBlackScreen = !liveState.isBlackScreen;
      liveState.isBlankScreen = false;
      broadcast({ type: 'SCREEN_TOGGLE', payload: { isBlackScreen: liveState.isBlackScreen, isBlankScreen: liveState.isBlankScreen } });
      break;

    case 'TOGGLE_BLANK':
      liveState.isBlankScreen = !liveState.isBlankScreen;
      liveState.isBlackScreen = false;
      broadcast({ type: 'SCREEN_TOGGLE', payload: { isBlackScreen: liveState.isBlackScreen, isBlankScreen: liveState.isBlankScreen } });
      break;

    case 'LOAD_SONG':
      liveState = {
        ...liveState,
        isLive: true,
        mode: 'song',
        currentSongId: payload.songId,
        currentSlideIndex: 0,
        isBlackScreen: false,
        isBlankScreen: false,
        slides: payload.slides || [],
        songTitle: payload.songTitle || '',
        songSettings: payload.songSettings || liveState.songSettings,
        welcomeSlide: null,
      };
      broadcast({ type: 'SONG_LOADED', payload: liveState });
      break;

    // ── Welcome mode ─────────────────────────────────────────
    case 'SHOW_WELCOME':
      liveState = {
        ...liveState,
        isLive: true,
        mode: 'welcome',
        isBlackScreen: false,
        isBlankScreen: false,
        welcomeSlide: payload.slide || null,
      };
      broadcast({ type: 'WELCOME_SHOWN', payload: liveState });
      break;

    case 'HIDE_WELCOME':
      liveState = {
        ...liveState,
        mode: 'idle',
        isLive: false,
        welcomeSlide: null,
        isBlackScreen: true,
      };
      broadcast({ type: 'WELCOME_HIDDEN', payload: {} });
      break;

    case 'STOP_LIVE':
      liveState.isLive = false;
      liveState.mode = 'idle';
      liveState.isBlackScreen = true;
      liveState.welcomeSlide = null;
      broadcast({ type: 'LIVE_STOPPED', payload: {} });
      break;

    case 'GET_STATE':
      senderWs.send(JSON.stringify({ type: 'STATE_SYNC', payload: liveState }));
      break;

    default:
      console.log('WS unknown message type:', type);
  }
}

function broadcast(message) {
  if (!wss) return;
  const str = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });
}

function getLiveState() {
  return liveState;
}

module.exports = { createWebSocketServer, broadcast, getLiveState };
