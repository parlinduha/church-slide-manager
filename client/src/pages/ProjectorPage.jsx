import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../hooks/useWebSocket';
import LyricRenderer from '../components/LyricRenderer';

// Countdown besar untuk proyektor
function CountdownProjector({ targetIso, color, fontSize }) {
  const [diff, setDiff] = useState(null);
  useEffect(() => {
    const tick = () => { const ms = new Date(targetIso) - new Date(); setDiff(ms > 0 ? ms : 0); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (diff === null) return null;
  if (diff === 0) return (
    <motion.p
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{ color, fontSize: `${fontSize * 0.5}px`, fontWeight: 'bold', textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}
    >
      Ibadah Dimulai!
    </motion.p>
  );

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <motion.p
      key={s}
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 1 }}
      style={{
        color,
        fontSize: `${fontSize * 0.7}px`,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        textShadow: '0 2px 20px rgba(0,0,0,0.95)',
        letterSpacing: '0.08em',
      }}
    >
      {h > 0 ? `${String(h).padStart(2,'0')}:` : ''}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </motion.p>
  );
}

/**
 * Halaman proyektor — dirancang untuk ditampilkan di layar/monitor kedua.
 *
 * Fullscreen:
 * Browser tidak mengizinkan requestFullscreen() dipanggil dari window lain
 * (cross-window security policy). Solusinya:
 * - Saat halaman pertama dibuka, tampilkan overlay "Klik untuk Fullscreen"
 * - User cukup klik SEKALI di mana saja → fullscreen aktif
 * - Overlay lalu menghilang — layar proyektor bersih
 * - Tombol F atau double-click mengaktifkan/keluar fullscreen kapan saja
 */
export default function ProjectorPage() {
  const { connected, liveState } = useWebSocket();

  const { slides, currentSlideIndex, isBlackScreen, isBlankScreen, isLive, songSettings, mode, welcomeSlide } = liveState;
  const currentSlide = slides?.[currentSlideIndex];

  const {
    background_color = '#000000',
    text_color = '#FFFFFF',
    font_size = 48,
    font_family = 'Arial',
    text_align = 'center',
  } = songSettings || {};

  // Overlay fullscreen: tampil saat baru buka, hilang setelah klik pertama
  const [showFsOverlay, setShowFsOverlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Fullscreen helpers ──────────────────────────────────────────
  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen)            await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen(); // Safari
      else if (el.mozRequestFullScreen)    await el.mozRequestFullScreen();    // Firefox lama
    } catch (_) {}
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen)            await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen)  await document.mozCancelFullScreen();
    } catch (_) {}
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  // Sinkronkan state isFullscreen dengan perubahan nyata dari browser
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || document.webkitFullscreenElement)
      );
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // ── Klik pertama: masuk fullscreen & sembunyikan overlay ─────────
  const handleFirstClick = useCallback(async () => {
    if (!showFsOverlay) return;
    setShowFsOverlay(false);
    await enterFullscreen();
  }, [showFsOverlay, enterFullscreen]);

  // ── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      switch (e.key) {
        case 'f':
        case 'F':
          // F = toggle fullscreen kapan saja
          toggleFullscreen();
          break;
        case 'F11':
          // Biarkan browser handle F11 secara native
          break;
        case 'Escape':
          // Escape keluar fullscreen (browser handle otomatis, ini untuk safety)
          if (document.fullscreenElement) exitFullscreen();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleFullscreen, exitFullscreen]);

  // ── Sembunyikan overlay jika user sudah fullscreen manual (F11) ──
  useEffect(() => {
    if (isFullscreen && showFsOverlay) {
      setShowFsOverlay(false);
    }
  }, [isFullscreen, showFsOverlay]);

  // ── Render ───────────────────────────────────────────────────────
  const bgColor = isBlackScreen
    ? '#000000'
    : isBlankScreen
    ? '#FFFFFF'
    : (mode === 'welcome' && welcomeSlide ? welcomeSlide.bg_color || '#0f172a' : background_color);

  const showText = !isBlackScreen && !isBlankScreen && isLive && currentSlide && mode === 'song';
  const showWelcome = !isBlackScreen && !isBlankScreen && mode === 'welcome' && welcomeSlide;

  return (
    <div
      onClick={showFsOverlay ? handleFirstClick : undefined}
      className="w-screen h-screen overflow-hidden flex items-center justify-center select-none relative"
      style={{ backgroundColor: bgColor, transition: 'background-color 0.3s ease' }}
    >
      {/* ── Konten slide ── */}
      <AnimatePresence mode="wait">
        {showWelcome ? (
          /* ── Mode Welcome ── */
          <motion.div
            key={`welcome-${welcomeSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* Media background */}
            {welcomeSlide.media_type === 'image' && welcomeSlide.media_url && (
              <img
                src={welcomeSlide.media_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {welcomeSlide.media_type === 'video' && welcomeSlide.media_url && (
              <video
                src={welcomeSlide.media_url}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                muted
                loop
              />
            )}
            {/* Audio background — tersembunyi tapi tetap main */}
            {welcomeSlide.media_type === 'audio' && welcomeSlide.media_url && (
              <audio src={welcomeSlide.media_url} autoPlay loop style={{ display: 'none' }} />
            )}

            {/* Overlay gelap untuk keterbacaan teks di atas media */}
            {(welcomeSlide.media_type === 'image' || welcomeSlide.media_type === 'video') && (
              <div className="absolute inset-0 bg-black/35" />
            )}

            {/* Teks */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-16"
              style={{ textAlign: welcomeSlide.text_align || 'center' }}
            >
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  color: welcomeSlide.text_color || '#fff',
                  fontSize: `${welcomeSlide.font_size || 52}px`,
                  fontFamily: welcomeSlide.font_family || 'Georgia',
                  fontWeight: 'bold',
                  lineHeight: 1.2,
                  textShadow: '0 3px 20px rgba(0,0,0,0.9)',
                  textAlign: welcomeSlide.text_align || 'center',
                  maxWidth: '100%',
                }}
              >
                {welcomeSlide.title}
              </motion.p>

              {welcomeSlide.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  style={{
                    color: welcomeSlide.text_color || '#fff',
                    fontSize: `${Math.round((welcomeSlide.font_size || 52) * 0.6)}px`,
                    fontFamily: welcomeSlide.font_family || 'Georgia',
                    marginTop: '16px',
                    opacity: 0.85,
                    textShadow: '0 2px 12px rgba(0,0,0,0.8)',
                    textAlign: welcomeSlide.text_align || 'center',
                    maxWidth: '100%',
                  }}
                >
                  {welcomeSlide.subtitle}
                </motion.p>
              )}

              {welcomeSlide.body_text && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    color: welcomeSlide.text_color || '#fff',
                    fontSize: `${Math.round((welcomeSlide.font_size || 52) * 0.38)}px`,
                    fontFamily: welcomeSlide.font_family || 'Georgia',
                    marginTop: '24px',
                    opacity: 0.65,
                    textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                    textAlign: welcomeSlide.text_align || 'center',
                    maxWidth: '80%',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {welcomeSlide.body_text}
                </motion.p>
              )}

              {/* Countdown mundur */}
              {welcomeSlide.show_countdown && welcomeSlide.countdown_target && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 flex flex-col items-center"
                >
                  <p style={{
                    color: welcomeSlide.text_color,
                    fontSize: `${Math.round((welcomeSlide.font_size || 52) * 0.32)}px`,
                    fontFamily: welcomeSlide.font_family,
                    opacity: 0.55,
                    marginBottom: '8px',
                    textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                  }}>
                    Ibadah dimulai dalam
                  </p>
                  <CountdownProjector
                    targetIso={welcomeSlide.countdown_target}
                    color={welcomeSlide.text_color || '#fff'}
                    fontSize={welcomeSlide.font_size || 52}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : showText ? (
          /* ── Mode Song — LyricRenderer dengan tipografi hidup ── */
          <motion.div
            key={`${currentSlideIndex}-${currentSlide.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center"
            style={{ padding: `${font_size * 0.8}px ${font_size * 1.2}px` }}
          >
            <LyricRenderer
              content={currentSlide.content}
              color={text_color}
              fontSize={font_size}
              fontFamily={font_family}
              textAlign={text_align}
              animationKey={`${currentSlideIndex}-${currentSlide.id}`}
            />
          </motion.div>
        ) : !isLive && !isBlackScreen ? (
          /* ── Standby ── */
          <motion.div
            key="standby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center pointer-events-none"
          >
            <p style={{ color: '#444', fontSize: '28px', fontFamily: 'Arial' }}>✝</p>
            <p style={{ color: '#333', fontSize: '18px', fontFamily: 'Arial', marginTop: '8px' }}>
              Siap Tayang
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Overlay "Klik untuk Fullscreen" ──
           Muncul sekali saat window pertama buka.
           Klik di mana saja → fullscreen + overlay hilang. */}
      <AnimatePresence>
        {showFsOverlay && (
          <motion.div
            key="fs-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="absolute inset-0 flex flex-col items-center justify-center z-50 cursor-pointer"
            style={{ backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
          >
            {/* Ikon monitor */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            >
              <svg
                width="72" height="72" viewBox="0 0 24 24"
                fill="none" stroke="white" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ opacity: 0.9 }}
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </motion.div>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                color: '#ffffff',
                fontSize: '22px',
                fontFamily: 'Arial, sans-serif',
                fontWeight: '600',
                marginTop: '24px',
                letterSpacing: '0.01em',
              }}
            >
              Klik untuk Fullscreen
            </motion.p>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                color: '#aaaaaa',
                fontSize: '14px',
                fontFamily: 'Arial, sans-serif',
                marginTop: '10px',
              }}
            >
              Tekan <kbd style={{
                background: '#333', color: '#fff', padding: '2px 6px',
                borderRadius: '4px', fontSize: '13px', fontFamily: 'monospace'
              }}>F</kbd> kapan saja untuk toggle fullscreen
            </motion.p>

            {/* Animasi pulse di border */}
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: '16px',
                border: '2px solid rgba(255,255,255,0.25)',
                borderRadius: '12px',
                pointerEvents: 'none',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Indikator status pojok kanan bawah ── */}
      <div
        className="fixed bottom-3 right-3 flex items-center gap-1.5 opacity-0 hover:opacity-100 transition-opacity duration-300"
        title={connected ? 'Terhubung ke server' : 'Koneksi terputus — coba refresh'}
        style={{ zIndex: 40 }}
      >
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
        {!isFullscreen && (
          <button
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#ccc',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              fontFamily: 'Arial',
              cursor: 'pointer',
            }}
          >
            Fullscreen
          </button>
        )}
      </div>
    </div>
  );
}
