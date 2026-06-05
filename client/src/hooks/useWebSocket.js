import { useEffect, useRef, useState, useCallback } from 'react';

// Deteksi URL WebSocket secara otomatis:
// - Di Electron: server jalan di port yang sama dengan halaman (3941)
// - Di browser dev: Vite proxy ke port 3001
// Gunakan port dari window.location agar selalu sinkron
function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || '127.0.0.1';
  // Di Electron window.location.port ada isinya (3941)
  // Di dev browser via Vite proxy, port adalah 5173 tapi proxy /ws ke 3001
  // Cek apakah berjalan di Electron (ada electronAPI) atau browser
  const isElectron = !!window.electronAPI;
  const port = isElectron
    ? (window.location.port || '3941')   // Electron: ikut port server
    : '';                                  // Browser: Vite proxy handle /ws
  const portStr = port ? `:${port}` : '';
  return `${protocol}//${host}${portStr}/ws`;
}

export function useWebSocket() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [liveState, setLiveState] = useState({
    isLive: false,
    mode: 'idle',
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
    },
    welcomeSlide: null,
  });
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const WS_URL = getWsUrl();
    console.log('[WS] Connecting to:', WS_URL);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Minta state terkini
        ws.send(JSON.stringify({ type: 'GET_STATE' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        } catch (err) {
          console.error('WS message parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect setelah 3 detik
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.error('WS connection error:', err);
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, []);

  const handleServerMessage = useCallback((data) => {
    const { type, payload } = data;

    switch (type) {
      case 'STATE_SYNC':
        setLiveState(payload);
        break;
      case 'SONG_LOADED':
        setLiveState(payload);
        break;
      case 'SLIDE_CHANGED':
        setLiveState(prev => ({ ...prev, currentSlideIndex: payload.index }));
        break;
      case 'SCREEN_TOGGLE':
        setLiveState(prev => ({ ...prev, isBlackScreen: payload.isBlackScreen, isBlankScreen: payload.isBlankScreen }));
        break;
      case 'WELCOME_SHOWN':
        setLiveState(payload);
        break;
      case 'WELCOME_HIDDEN':
        setLiveState(prev => ({ ...prev, isLive: false, mode: 'idle', welcomeSlide: null, isBlackScreen: true }));
        break;
      case 'LIVE_STOPPED':
        setLiveState(prev => ({ ...prev, isLive: false, mode: 'idle', isBlackScreen: true, welcomeSlide: null }));
        break;
    }
  }, []);

  const send = useCallback((type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, liveState, send };
}
