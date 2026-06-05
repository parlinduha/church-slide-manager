import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Square, Eye, EyeOff, Wifi, WifiOff,
  Music, StopCircle, List, SkipBack, SkipForward, MonitorCheck, MonitorOff
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useProjector } from '../hooks/useProjector';
import { useStore } from '../store/useStore';
import SlidePreview from '../components/SlidePreview';

export default function LivePage() {
  const { connected, liveState, send } = useWebSocket();
  const { songs, services, fetchSongs, fetchServices, addToast } = useStore();
  const { openProjector, closeProjector, isOpen: projectorOpen } = useProjector();

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [serviceItems, setServiceItems] = useState([]);
  const [serviceItemIdx, setServiceItemIdx] = useState(0);

  useEffect(() => {
    fetchSongs();
    fetchServices();
  }, []);

  // Susun item dari sesi yang dipilih
  useEffect(() => {
    if (selectedServiceId) {
      const service = services.find(s => s.id === parseInt(selectedServiceId));
      if (service) {
        const items = (service.items || []).map(item => ({
          ...item,
          song: songs.find(s => s.id === item.songId),
        })).filter(item => item.song);
        setServiceItems(items);
      }
    }
  }, [selectedServiceId, services, songs]);

  const loadSong = useCallback((song) => {
    if (!song) return;
    setSelectedSong(song);
    send('LOAD_SONG', {
      songId: song.id,
      songTitle: song.title,
      slides: song.slides,
      songSettings: {
        background_color: song.background_color,
        text_color: song.text_color,
        font_size: song.font_size,
        font_family: song.font_family,
        text_align: song.text_align,
      },
    });
  }, [send]);

  const handlePrev = () => send('PREV_SLIDE');
  const handleNext = () => send('NEXT_SLIDE');
  const handleGoto = (idx) => send('GOTO_SLIDE', { index: idx });
  const handleBlack = () => send('TOGGLE_BLACK');
  const handleBlank = () => send('TOGGLE_BLANK');
  const handleStop = () => send('STOP_LIVE');

  const handleServiceNext = () => {
    const nextIdx = serviceItemIdx + 1;
    if (nextIdx < serviceItems.length) {
      setServiceItemIdx(nextIdx);
      loadSong(serviceItems[nextIdx].song);
    }
  };

  const handleServicePrev = () => {
    const prevIdx = serviceItemIdx - 1;
    if (prevIdx >= 0) {
      setServiceItemIdx(prevIdx);
      loadSong(serviceItems[prevIdx].song);
    }
  };

  const currentSlide = liveState.slides?.[liveState.currentSlideIndex];
  const settings = liveState.songSettings;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          send('NEXT_SLIDE');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          send('PREV_SLIDE');
          break;
        case 'b':
        case 'B':
          send('TOGGLE_BLACK');
          break;
        case 'w':
        case 'W':
          send('TOGGLE_BLANK');
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [send]);

  const handleOpenProjector = async () => {
    if (projectorOpen) {
      closeProjector();
      return;
    }
    const result = await openProjector();
    if (result.success) {
      addToast(result.message, result.method === 'window-management' ? 'success' : 'info');
    } else {
      addToast(result.message, 'error');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-600 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
            connected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'Terhubung' : 'Terputus'}
          </div>

          {liveState.isLive && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-red-600 text-white animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              LIVE
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleOpenProjector} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            projectorOpen
              ? 'bg-green-700 hover:bg-green-600 text-white'
              : 'bg-surface-700 hover:bg-surface-600 text-gray-300 hover:text-white'
          }`}>
            {projectorOpen ? <MonitorCheck size={13} /> : <MonitorOff size={13} />}
            {projectorOpen ? 'Proyektor Aktif' : 'Buka Proyektor'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left - Song selector & service */}
        <div className="w-72 border-r border-surface-600 flex flex-col overflow-hidden">
          {/* Pilih sesi */}
          <div className="p-3 border-b border-surface-600">
            <label className="block text-xs text-gray-400 mb-1.5">Sesi Ibadah</label>
            <select
              className="input-field text-sm"
              value={selectedServiceId}
              onChange={e => { setSelectedServiceId(e.target.value); setServiceItemIdx(0); }}
            >
              <option value="">— Pilih sesi —</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.date})</option>
              ))}
            </select>
          </div>

          {/* Navigasi sesi */}
          {serviceItems.length > 0 && (
            <div className="p-2 border-b border-surface-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Urutan Lagu Sesi</span>
                <span className="text-xs text-gray-500">{serviceItemIdx + 1}/{serviceItems.length}</span>
              </div>
              <div className="flex gap-1.5 mb-2">
                <button
                  onClick={handleServicePrev}
                  disabled={serviceItemIdx === 0}
                  className="flex-1 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-40 text-white"
                >
                  <SkipBack size={12} /> Sebelumnya
                </button>
                <button
                  onClick={handleServiceNext}
                  disabled={serviceItemIdx >= serviceItems.length - 1}
                  className="flex-1 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-40 text-white"
                >
                  Berikutnya <SkipForward size={12} />
                </button>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {serviceItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => { setServiceItemIdx(idx); loadSong(item.song); }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                      idx === serviceItemIdx
                        ? 'bg-primary-600/30 text-primary-300'
                        : 'hover:bg-surface-700 text-gray-400'
                    }`}
                  >
                    {idx + 1}. {item.song?.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Daftar semua lagu */}
          <div className="flex items-center px-3 py-2 border-b border-surface-600">
            <List size={12} className="text-gray-500 mr-1.5" />
            <span className="text-xs text-gray-400">Semua Lagu</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {songs.map(song => (
              <button
                key={song.id}
                onClick={() => loadSong(song)}
                className={`w-full text-left px-2 py-2 rounded-lg transition-colors ${
                  liveState.currentSongId === song.id
                    ? 'bg-primary-600/20 ring-1 ring-primary-600'
                    : 'hover:bg-surface-700'
                }`}
              >
                <p className="text-xs font-medium text-white truncate">{song.title}</p>
                <p className="text-xs text-gray-500">
                  {song.key_signature ? `${song.key_signature} · ` : ''}{song.slides?.length} slide
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Center - Main preview & controls */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main preview */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <div className="w-full max-w-2xl">
              {liveState.isLive ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-300">{liveState.songTitle}</p>
                    <p className="text-xs text-gray-500">
                      Slide {liveState.currentSlideIndex + 1} / {liveState.slides?.length || 0}
                    </p>
                  </div>
                  <SlidePreview
                    slide={currentSlide}
                    settings={settings}
                    isActive
                    isBlackScreen={liveState.isBlackScreen}
                    isBlankScreen={liveState.isBlankScreen}
                    size="lg"
                    showLabel={false}
                  />
                </>
              ) : (
                <div className="slide-preview bg-black flex items-center justify-center">
                  <div className="text-center">
                    <Music size={48} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Pilih lagu untuk mulai</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="border-t border-surface-600 p-4 shrink-0">
            {/* Slide navigation buttons */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={handlePrev}
                disabled={!liveState.isLive || liveState.currentSlideIndex === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-700 hover:bg-surface-600 disabled:opacity-30 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <ChevronLeft size={18} /> Sebelumnya
              </button>

              <button
                onClick={handleNext}
                disabled={!liveState.isLive || liveState.currentSlideIndex >= (liveState.slides?.length || 0) - 1}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-30 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Berikutnya <ChevronRight size={18} />
              </button>
            </div>

            {/* Special controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleBlack}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  liveState.isBlackScreen
                    ? 'bg-yellow-600 text-white'
                    : 'bg-surface-700 hover:bg-surface-600 text-white'
                }`}
              >
                <Square size={14} />
                {liveState.isBlackScreen ? 'Matikan Hitam' : 'Layar Hitam'}
              </button>

              <button
                onClick={handleBlank}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  liveState.isBlankScreen
                    ? 'bg-yellow-600 text-white'
                    : 'bg-surface-700 hover:bg-surface-600 text-white'
                }`}
              >
                {liveState.isBlankScreen ? <Eye size={14} /> : <EyeOff size={14} />}
                {liveState.isBlankScreen ? 'Tampilkan' : 'Layar Putih'}
              </button>

              <button
                onClick={handleStop}
                disabled={!liveState.isLive}
                className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-30 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <StopCircle size={14} /> Stop Live
              </button>
            </div>
          </div>
        </div>

        {/* Right - Slide thumbnails */}
        <div className="w-52 border-l border-surface-600 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-600">
            <span className="text-xs text-gray-400">SLIDE NAVIGATOR</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {liveState.slides?.length > 0 ? (
              liveState.slides.map((slide, idx) => (
                <div key={slide.id || idx} className="cursor-pointer" onClick={() => handleGoto(idx)}>
                  <SlidePreview
                    slide={slide}
                    settings={settings}
                    isActive={idx === liveState.currentSlideIndex}
                    isBlackScreen={liveState.isBlackScreen && idx === liveState.currentSlideIndex}
                    isBlankScreen={liveState.isBlankScreen && idx === liveState.currentSlideIndex}
                    size="sm"
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 text-xs">Tidak ada slide</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="border-t border-surface-700 px-6 py-1.5 flex items-center gap-4 text-xs text-gray-600 shrink-0">
        <span>← → : Navigasi slide</span>
        <span>B : Layar hitam</span>
        <span>W : Layar putih</span>
      </div>
    </div>
  );
}
