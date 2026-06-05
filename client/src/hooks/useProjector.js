import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook untuk membuka & mengelola jendela proyektor.
 *
 * Strategi bertingkat:
 * 1. Window Management API  → minta izin, baca daftar layar, buka window di layar kedua,
 *    kirim sinyal ke ProjectorPage untuk auto-fullscreen via user gesture di sana.
 * 2. Fallback                → window.open() dengan posisi + ukuran layar penuh agar
 *    browser tidak mengubahnya jadi tab.
 *
 * Catatan keamanan browser:
 * - requestFullscreen() HANYA bisa dipanggil dari dalam window itu sendiri
 *   sebagai respons user gesture. Tidak bisa dipaksa dari luar.
 * - Solusi: ProjectorPage menampilkan overlay "Klik untuk Fullscreen" yang
 *   langsung aktif saat window terbuka dan user klik sekali.
 */
export function useProjector() {
  const [projectorWin, setProjectorWin] = useState(null);
  const [screens, setScreens] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const winRef = useRef(null);

  useEffect(() => {
    setIsSupported('getScreenDetails' in window);
  }, []);

  // Pantau apakah window proyektor masih hidup
  useEffect(() => {
    if (!winRef.current) return;
    const interval = setInterval(() => {
      if (winRef.current?.closed) {
        winRef.current = null;
        setProjectorWin(null);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [projectorWin]);

  const requestScreens = useCallback(async () => {
    if (!isSupported) return null;
    try {
      const details = await window.getScreenDetails();
      const list = details.screens || [];
      setScreens(list);
      setHasPermission(true);
      return list;
    } catch {
      setHasPermission(false);
      return null;
    }
  }, [isSupported]);

  /**
   * Buka window proyektor.
   *
   * Trik agar selalu menjadi window bukan tab:
   * - Sertakan left, top, width, height yang eksplisit.
   * - Gunakan nama unik (bukan '_blank') agar tidak di-reuse sebagai tab.
   * - Jika Window Management API tersedia → posisikan tepat di layar ke-2.
   * - Jika tidak → posisikan di koordinat screen.availLeft / screen.availTop
   *   sehingga browser mengenalinya sebagai popup terpisah.
   */
  const openProjector = useCallback(async () => {
    // Sudah terbuka → fokuskan saja
    if (winRef.current && !winRef.current.closed) {
      winRef.current.focus();
      return { success: true, method: 'focus', message: 'Window proyektor sudah terbuka.' };
    }

    // ── Mode Electron: gunakan IPC untuk buka window native ──────
    if (window.electronAPI) {
      try {
        const displays = await window.electronAPI.getDisplays();
        setScreens(displays);
        // Pilih layar non-primary sebagai target proyektor
        const target = displays.find(d => !d.isPrimary) || displays[0];
        const result = await window.electronAPI.openProjector(target?.id);
        setHasPermission(true);
        // Di Electron, window proyektor dikelola oleh main process
        // Tandai sebagai "terbuka" dengan objek sentinel
        winRef.current = { closed: false, close: () => window.electronAPI.closeProjector() };
        setProjectorWin(winRef.current);
        return {
          success: true,
          method: 'electron',
          message: result.isPrimary
            ? 'Hanya 1 layar terdeteksi. Proyektor dibuka di layar yang sama.'
            : `Proyektor dibuka fullscreen di ${result.displayLabel}.`,
        };
      } catch (err) {
        return { success: false, method: 'electron-error', message: err.message };
      }
    }

    // ── Coba Window Management API ───────────────────────────────
    if (isSupported) {
      const screenList = await requestScreens();

      if (screenList && screenList.length > 0) {
        const secondary = screenList.find(s => !s.isPrimary) ?? screenList[screenList.length - 1];

        const left   = secondary.availLeft   ?? secondary.left   ?? 0;
        const top    = secondary.availTop    ?? secondary.top    ?? 0;
        const width  = secondary.availWidth  ?? secondary.width  ?? 1280;
        const height = secondary.availHeight ?? secondary.height ?? 720;

        const win = window.open(
          '/projector',
          'church-projector',
          // left/top + width/height eksplisit = browser WAJIB buka window baru
          `left=${left},top=${top},width=${width},height=${height},` +
          'menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no'
        );

        if (win) {
          winRef.current = win;
          setProjectorWin(win);
          // Kirim sinyal ke proyektor agar tampilkan overlay fullscreen
          // (window.open() adalah cross-origin-safe karena same origin)
          win.addEventListener('load', () => {
            // Tandai bahwa window ini dibuka sebagai popup proyektor
            // ProjectorPage membaca ini untuk auto-trigger overlay
            try { win.__PROJECTOR_POPUP__ = true; } catch {}
          }, { once: true });

          const isSecondary = !secondary.isPrimary;
          return {
            success: true,
            method: 'window-management',
            screenLabel: secondary.label || '',
            message: isSecondary
              ? `Proyektor dibuka di "${secondary.label || 'Layar ke-2'}" (${width}×${height}). Klik layar proyektor untuk fullscreen.`
              : `Hanya 1 layar. Klik window proyektor untuk fullscreen.`,
          };
        }
      }
    }

    // ── Fallback: posisikan di kanan layar utama ──────────────────
    // Gunakan screen.availWidth sebagai offset kiri agar browser tahu ini popup
    // di luar viewport utama → lebih sering dibuka sebagai window daripada tab.
    const sw = window.screen.availWidth  || 1280;
    const sh = window.screen.availHeight || 720;

    // Coba posisi di layar yang sama tapi ukuran penuh — ini memaksa Chrome
    // membuka popup window (bukan tab) karena ada koordinat eksplisit
    const win = window.open(
      '/projector',
      'church-projector',
      `left=0,top=0,width=${sw},height=${sh},` +
      'menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no'
    );

    if (win) {
      winRef.current = win;
      setProjectorWin(win);
      return {
        success: true,
        method: 'fallback',
        message: 'Window proyektor dibuka. Klik di dalam layar proyektor untuk fullscreen, lalu pindah ke layar eksternal.',
      };
    }

    return {
      success: false,
      method: 'blocked',
      message: 'Pop-up diblokir browser. Izinkan pop-up untuk situs ini di pengaturan browser, lalu coba lagi.',
    };
  }, [isSupported, requestScreens]);

  const closeProjector = useCallback(() => {
    if (winRef.current && !winRef.current.closed) {
      winRef.current.close();
    }
    winRef.current = null;
    setProjectorWin(null);
  }, []);

  const isOpen = !!projectorWin && !projectorWin.closed;

  return { openProjector, closeProjector, isOpen, isSupported, hasPermission, screens };
}
