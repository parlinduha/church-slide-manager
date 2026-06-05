const { contextBridge, ipcRenderer } = require('electron');

/**
 * electronAPI — tersedia di window.electronAPI di renderer process.
 * Semua akses ke fitur native Electron harus lewat sini (contextIsolation).
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ── Deteksi apakah berjalan di dalam Electron ──────────────────
  isElectron: true,

  // ── Info app ───────────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  // ── Proyektor ──────────────────────────────────────────────────
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  openProjector: (displayId) => ipcRenderer.invoke('open-projector', displayId),
  closeProjector: () => ipcRenderer.invoke('close-projector'),
  setProjectorFullscreen: (enable) => ipcRenderer.invoke('projector-fullscreen', enable),

  // ── Dialog file (untuk import/export) ─────────────────────────
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
});
