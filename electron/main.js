import { app, BrowserWindow, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

let mainWindow = null;
let serverProcess = null;
let embeddedServer = null;

// Determine writable paths on macOS
const userDataDir = app.getPath('userData');
const cacheDir = path.join(userDataDir, 'audio_cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}
process.env.CACHE_DIR = cacheDir;

// On macOS, add homebrew & venv paths so CLI tools like yt-dlp or ffmpeg are accessible
if (process.platform === 'darwin') {
  const extraPaths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    path.join(rootDir, '.venv', 'bin')
  ];
  process.env.PATH = `${extraPaths.join(':')}:${process.env.PATH || ''}`;
}

// Check if backend server is already running on port 3030
function isServerRunning(port = 3030) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/status`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start the local companion backend if not running
async function ensureBackendServer() {
  const running = await isServerRunning(3030);
  if (!running) {
    try {
      console.log('🚀 Spawning embedded Pulse Audio Server on port 3030...');
      const serverModule = await import('../server/server.js');
      embeddedServer = serverModule.server || serverModule.default;
      console.log('✅ Pulse Audio Server running in-process');
    } catch (err) {
      console.warn('In-process server launch failed:', err);
      if (!app.isPackaged) {
        try {
          serverProcess = spawn('node', ['server.js'], {
            cwd: rootDir,
            stdio: 'inherit',
            env: { ...process.env, PORT: '3030' },
          });
        } catch (spawnErr) {
          console.error('Spawn fallback error:', spawnErr);
        }
      }
    }
  } else {
    console.log('✅ Pulse Audio Companion Server is already active on port 3030');
  }
}

async function createWindow() {
  const icnsPath = path.join(rootDir, 'build', 'icon.icns');
  const pngPath = path.join(rootDir, 'build', 'icon.png');
  const activeIcon = fs.existsSync(icnsPath) ? icnsPath : pngPath;

  // On macOS: In packaged production, macOS automatically displays the high-res transparent
  // icon from CFBundleIconFile (icon.icns). Calling app.dock.setIcon dynamically flattens
  // alpha transparency into a white box, so we ONLY set dock icon during development.
  if (process.platform === 'darwin' && app.dock && !app.isPackaged) {
    try {
      if (fs.existsSync(pngPath)) {
        app.dock.setIcon(pngPath);
      }
    } catch (e) {}
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'Pulse Music Player',
    icon: activeIcon,
    backgroundColor: '#0a0d14',
    titleBarStyle: 'hiddenInset', // Sleek macOS native traffic lights in dark header
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false, // Don't throttle audio playback when window is hidden
    },
  });

  // Check if dev server is up (only in non-packaged dev mode)
  const isDevRunning = !app.isPackaged && (await isServerRunning(5173));
  if (isDevRunning) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Wait for embedded port 3030 to be ready
    let ready = await isServerRunning(3030);
    let attempts = 0;
    while (!ready && attempts < 30) {
      await new Promise((r) => setTimeout(r, 150));
      ready = await isServerRunning(3030);
      attempts++;
    }

    if (ready) {
      mainWindow.loadURL('http://127.0.0.1:3030');
    } else {
      mainWindow.loadFile(path.join(rootDir, 'dist', 'index.html'));
    }
  }

  // Spotify-style macOS behavior: clicking 'X' hides window while audio keeps playing
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Track when user explicitly requests to Quit (Dock menu -> Quit, or Cmd+Q)
let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

// Single instance lock to focus window if opened again
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  await ensureBackendServer();
  await createWindow();

  // Re-show window when clicking Dock icon
  app.on('activate', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps stay active in background until explicit Cmd+Q or Quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (embeddedServer && typeof embeddedServer.close === 'function') {
    try {
      embeddedServer.close();
    } catch (e) {}
  }
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {}
  }
});
