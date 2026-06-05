const { app, BrowserWindow, shell, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const http = require('http');

// ─── Cegah multiple instance ──────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ─── Resolve path saat di dalam asar ─────────────────────────────────────────
function getServerPath() {
  // Di production (asar), server ada di dalam asar bundle
  if (app.isPackaged) {
    // app.getAppPath() mengembalikan path ke app.asar
    return path.join(app.getAppPath(), 'server');
  }
  // Di development
  return path.join(__dirname, '../server');
}

// ─── Jalankan Express server internal ────────────────────────────────────────
let serverInstance = null;
const SERVER_PORT = 3941; // Port unik agar tidak konflik dengan aplikasi lain

async function startServer() {
  return new Promise((resolve, reject) => {
    try {
      const serverPath = getServerPath();

      // Set env vars agar server tahu di mana menyimpan data
      process.env.SERVER_ROOT = serverPath;
      process.env.PORT = String(SERVER_PORT);
      process.env.DATA_DIR = path.join(app.getPath('userData'), 'data');
      // Client dist ada di Resources/client/dist (extraResources)
      if (app.isPackaged) {
        process.env.CLIENT_DIST = path.join(process.resourcesPath, 'client/dist');
      } else {
        process.env.CLIENT_DIST = path.join(__dirname, '../client/dist');
      }

      // Load server Express
      require(path.join(serverPath, 'index-electron.js'));
      resolve();
    } catch (err) {
      console.error('Gagal menjalankan server:', err);
      reject(err);
    }
  });
}

// ─── Tunggu server siap ───────────────────────────────────────────────────────
function waitForServer(maxRetries = 30) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      http.get(`http://127.0.0.1:${SERVER_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else retry();
      }).on('error', retry);
    };
    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        reject(new Error('Server tidak merespons setelah 30 detik'));
      } else {
        setTimeout(check, 1000);
      }
    };
    check();
  });
}

// ─── Windows ──────────────────────────────────────────────────────────────────
let mainWindow = null;
let projectorWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Church Slide Manager',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    backgroundColor: '#0f0f0f',
    show: false, // tampilkan setelah ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Tutup proyektor juga jika main window ditutup
    if (projectorWindow && !projectorWindow.isDestroyed()) {
      projectorWindow.close();
    }
  });

  // Buka link eksternal di browser default, bukan di Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1')) {
      // Buka window proyektor internal
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  setupMenu();
  setupTray();
}

function createProjectorWindow(screenBounds) {
  // Jika sudah ada, fokus saja
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.focus();
    return projectorWindow;
  }

  const bounds = screenBounds || { x: 0, y: 0, width: 1280, height: 720 };

  projectorWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    title: 'Proyektor — Church Slide Manager',
    frame: false,
    backgroundColor: '#000000',
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  projectorWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}/projector`);

  projectorWindow.on('closed', () => {
    projectorWindow = null;
  });

  return projectorWindow;
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-displays', async () => {
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  return displays.map(d => ({
    id: d.id,
    label: d.id === primary.id ? 'Layar Utama' : `Layar ${d.id}`,
    isPrimary: d.id === primary.id,
    bounds: d.bounds,
    workArea: d.workArea,
    size: d.size,
  }));
});

ipcMain.handle('open-projector', async (event, displayId) => {
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();

  let targetDisplay = displays.find(d => d.id === displayId);
  if (!targetDisplay) {
    // Pilih layar non-primary, atau primary jika hanya 1 layar
    targetDisplay = displays.find(d => d.id !== primary.id) || primary;
  }

  const bounds = targetDisplay.bounds;
  const win = createProjectorWindow(bounds);

  // Fullscreen di layar target setelah load
  win.once('ready-to-show', () => {
    win.setFullScreen(true);
  });

  return {
    success: true,
    displayLabel: targetDisplay.id === primary.id ? 'Layar Utama' : `Layar Eksternal`,
    isPrimary: targetDisplay.id === primary.id,
  };
});

ipcMain.handle('close-projector', async () => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.close();
  }
  return { success: true };
});

ipcMain.handle('projector-fullscreen', async (event, enable) => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.setFullScreen(enable);
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// ─── Menu aplikasi ────────────────────────────────────────────────────────────
function setupMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Buka Proyektor',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(
                'window.electronAPI && window.electronAPI.openProjector()'
              );
            }
          },
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit', label: 'Keluar' },
      ],
    },
    {
      label: 'Tampilan',
      submenu: [
        { role: 'reload', label: 'Muat Ulang' },
        { role: 'forceReload', label: 'Muat Ulang Paksa' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Ukuran Normal' },
        { role: 'zoomIn', label: 'Perbesar' },
        { role: 'zoomOut', label: 'Perkecil' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Layar Penuh' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Potong' },
        { role: 'copy', label: 'Salin' },
        { role: 'paste', label: 'Tempel' },
        { role: 'selectAll', label: 'Pilih Semua' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── System Tray ─────────────────────────────────────────────────────────────
let tray = null;

function setupTray() {
  try {
    const { Tray } = require('electron');
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    const fs = require('fs');
    if (!fs.existsSync(iconPath)) return; // skip jika icon belum ada

    tray = new Tray(iconPath);
    tray.setToolTip('Church Slide Manager');
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Buka Aplikasi', click: () => mainWindow?.show() },
      { label: 'Buka Proyektor', click: () => createProjectorWindow() },
      { type: 'separator' },
      { label: 'Keluar', click: () => app.quit() },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow?.show());
  } catch (_) {
    // Tray tidak kritikal, lanjut jika gagal
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Tampilkan splash / loading sederhana sambil server start
  const splash = new BrowserWindow({
    width: 400,
    height: 280,
    frame: false,
    resizable: false,
    backgroundColor: '#0f0f0f',
    alwaysOnTop: true,
    webPreferences: { contextIsolation: true },
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));

  try {
    await startServer();
    await waitForServer();
    splash.close();
    createMainWindow();
  } catch (err) {
    splash.close();
    dialog.showErrorBox(
      'Gagal Menjalankan Aplikasi',
      `Server internal tidak bisa dijalankan:\n\n${err.message}\n\nCoba restart aplikasi.`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
