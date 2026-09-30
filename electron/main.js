import { app, BrowserWindow, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

let mainWindow = null;
let serverProcess = null;

// Check if backend server is already running on port 3030
function isServerRunning(port = 3030) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/status`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start the local companion backend if not running
async function ensureBackendServer() {
  const running = await isServerRunning(3030);
  if (!running) {
    console.log('🚀 Spawning Pulse Audio Companion Server on port 3030...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, PORT: '3030' },
    });

    serverProcess.on('error', (err) => {
      console.warn('Failed to start backend server process:', err);
    });
  } else {
    console.log('✅ Pulse Audio Companion Server is already active on port 3030');
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'Pulse Music Player',
    backgroundColor: '#0a0d14',
    titleBarStyle: 'hiddenInset', // Sleek macOS native traffic lights in dark header
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Check if dev server is up, else load production local server or dist
  const isDevRunning = await isServerRunning(5173);
  if (isDevRunning) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Wait slightly for port 3030 to be ready if server was just spawned
    let ready = await isServerRunning(3030);
    let attempts = 0;
    while (!ready && attempts < 10) {
      await new Promise((r) => setTimeout(r, 400));
      ready = await isServerRunning(3030);
      attempts++;
    }

    if (ready) {
      mainWindow.loadURL('http://localhost:3030');
    } else {
      mainWindow.loadFile(path.join(rootDir, 'dist', 'index.html'));
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await ensureBackendServer();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {}
  }
});
