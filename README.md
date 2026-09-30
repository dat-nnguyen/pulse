# ⚡ Pulse — Free Lossless Music Player

> **Personal, ad-free, high-fidelity music & podcast player for macOS, iOS, Android, and Web.**  
> Zero subscriptions. Zero advertisements. Bit-perfect original audio with continuous background lock-screen playback and cloud library sync.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20iOS%20%7C%20Android%20%7C%20Web-00c2d1.svg)](https://github.com/dat-nnguyen/real-free-music-player)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg)](https://vitejs.dev/)
[![Electron](https://img.shields.io/badge/Electron-44.x-47848F.svg)](https://www.electronjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud%20Sync-3ECF8E.svg)](https://supabase.com/)

---

## ✨ Features

- **💎 Bit-Perfect High-Fidelity Audio**: Preserves original 320kbps MP3, FLAC (24-bit lossless), WAV, and M4A audio without lossy re-encoding or artificial degradation.
- **🖥️ Native macOS Desktop App**:
  - Packaged native macOS app (`Pulse.app` in `/Applications`) and `.dmg` installer.
  - Native window dragging with sleek traffic light window control placement.
  - Transparent dock icon integration matching macOS design standards.
- **📱 Seamless iPhone & Android Support**:
  - **Instant Safari PWA**: Add to Home Screen directly from Safari for a fullscreen, borderless native feel.
  - **Native iOS Project**: Pre-configured Capacitor iOS project ready for Xcode compilation.
  - **Continuous Lock-Screen Playback**: Keeps playing when the screen is locked or while multitasking, with native lock-screen media controls and album artwork via MediaSession.
- **☁️ Cloud Sync (Supabase Backend)**:
  - Synchronize playlists, favorites, and library tracks across your Mac, iPhone, and Web in real time.
  - Secure authentication with email & password, password reset, and encrypted sessions.
  - Direct offline backup & restore via JSON export/import (AirDrop / file transfer).
- **🧭 Two-Way History Navigation Stack**:
  - Interactive TopBar navigation with **Back (`<`)**, **Forward (`>`)**, and **Home (`🏠`)** buttons.
  - Full keyboard shortcuts: <kbd>⌘</kbd> + <kbd>[</kbd> / <kbd>Alt</kbd> + <kbd>←</kbd> (Back) and <kbd>⌘</kbd> + <kbd>]</kbd> / <kbd>Alt</kbd> + <kbd>→</kbd> (Forward).
- **📥 Music & Podcast Ingestion Engine**:
  - **YouTube & Web Audio**: Download songs, albums, and playlists in master 320kbps quality directly into your library.
  - **Apple Podcasts Directory**: Search millions of podcasts, stream live, or download episodes for offline listening.
  - **Local Audio Drag & Drop**: Drop `.mp3`, `.flac`, `.wav`, or `.m4a` files directly into the window with automatic metadata and cover art extraction.
- **💾 100% Offline Vault**:
  - All downloaded audio tracks are stored locally in your device's persistent IndexedDB storage.
  - Listen offline on airplanes, commutes, or off-grid without data usage.
- **🎛️ Hardware-Accelerated 5-Band Equalizer**:
  - Parametric Web Audio EQ (60Hz, 250Hz, 1kHz, 4kHz, 16kHz) with dedicated Bass Boost.
  - Studio presets: *Bass Boost, Vocal, Acoustic, Rock, Electronic, Flat, Treble Boost*.
  - Real-time frequency spectrum visualizer canvas.
- **📋 Right-Click Context Menus**:
  - Desktop-native contextual right-click menus on tracks and playlists (Play, Add to Playlist, Remove from Playlist, Delete).

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 18+ (tested on Node.js 20 and Node.js 26)
- npm or pnpm
- macOS (for macOS native desktop app and Xcode iOS build)

### Installation

```bash
# Clone the repository
git clone https://github.com/dat-nnguyen/real-free-music-player.git
cd real-free-music-player

# Install dependencies
npm install

# Start the local development server (binds to 0.0.0.0 for LAN access)
npm run dev
```

- Open **[http://localhost:5173](http://localhost:5173)** on your Mac or PC.
- Open **`http://<your-mac-ip>:5173`** on your iPhone or Android phone connected to the same Wi-Fi network.

---

## 💻 macOS Native Desktop App

Pulse can be compiled and installed directly to your Mac's `/Applications` folder as a native desktop application:

```bash
# Build frontend and install directly to /Applications/Pulse.app
npm run install:mac

# Or build the standalone DMG installer in release/
npm run dist:mac
```

Once installed, launch **Pulse** from Spotlight (<kbd>⌘</kbd> + <kbd>Space</kbd>) or Launchpad.

---

## 📲 iPhone & Mobile Installation

### Option 1: Instant Safari PWA (Recommended — Fast & Wireless)

1. Make sure your iPhone is connected to the same Wi-Fi network as your Mac.
2. In **Safari** on your iPhone, navigate to your Mac's LAN IP:
   ```text
   http://<your-mac-ip>:5173
   ```
3. Tap the **Share** button at the bottom of Safari (the square with the upward arrow `[↑]`).
4. Scroll down and tap **"Add to Home Screen"** (*Thêm vào MH chính*).
5. Tap **Add**. Pulse will appear on your home screen as a standalone, fullscreen app with lock-screen playback.

### Option 2: Native iOS Build via Xcode (Capacitor)

1. Sync the latest web build to the iOS project:
   ```bash
   npm run ios:sync
   ```
2. Open the project in Xcode:
   ```bash
   npm run ios:open
   ```
3. In Xcode, connect your iPhone via USB, select your personal signing team under **Signing & Capabilities**, and press **⌘ + R** to run.

---

## ☁️ Cloud Sync (Supabase Backend)

Pulse supports real-time cloud synchronization for playlists, favorites, and audio across all your devices using Supabase.

### 1. Environment Setup

Create a `.env` file in the root directory (based on `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 2. Database Schema

1. Create a free account at [supabase.com](https://supabase.com) and create a project.
2. In the Supabase Dashboard, open the **SQL Editor**.
3. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   - Creates `tracks`, `playlists`, `playlist_tracks`, and `likes` tables.
   - Configures the `audio-files` storage bucket.
   - Sets up Row Level Security (RLS) policies for user data isolation.

### 3. In-App Sync & Authentication

- Tap the **Cloud Sync icon** (green dot indicator) in Pulse's TopBar or Sidebar to sign in, register, or enter credentials on any device.
- Alternatively, use the **Share / Install** modal (<kbd>Smartphone</kbd> icon) to **Export** or **Import** your entire library as a `.json` backup file via AirDrop or iCloud.

---

## 📦 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Launch Vite dev server bound to `--host` for local & mobile access |
| `npm run build` | Build the optimized client bundle into `dist/` |
| `npm run server` | Launch the audio extraction & metadata backend server on port 3001 |
| `npm run desktop` | Launch the native desktop app with Electron in development mode |
| `npm run install:mac` | Build, package, and install `Pulse.app` to `/Applications` |
| `npm run dist:mac` | Package the release `.dmg` installer for macOS |
| `npm run pack:mac` | Package the macOS directory bundle without generating a DMG |
| `npm run ios:sync` | Sync frontend assets from `dist/` to the Capacitor iOS project |
| `npm run ios:open` | Open the native iOS project in Xcode |
| `npm run start` | Build the client and run the unified production server |
| `npm run lint` | Run the linter (`oxlint`) |

---

## 📁 Architecture Overview

```text
├── electron/               # Native macOS Electron desktop integration
│   ├── main.js             # Main process, window lifecycle, dock icon
│   └── preload.js          # Secure IPC preload bridge
├── ios/App/                # Native Capacitor iOS project (Xcode workspace)
├── server/                 # Production Node.js backend
│   ├── controllers/        # Download and podcast search controllers
│   ├── services/           # yt-dlp audio extraction, RSS podcast parser
│   └── server.js           # Express API server
├── src/                    # Frontend React 19 application
│   ├── components/         # TopBar, Sidebar, PlayerBar, Library, Equalizer, Modals
│   ├── services/           # AudioEngine, IndexedDB storageService, SupabaseClient
│   ├── App.jsx             # Root application coordinator & navigation stack
│   └── index.css           # Pulse bespoke design tokens, glassmorphism, responsive CSS
├── build/                  # App icons (icon.icns, icon.png)
├── supabase/               # Database migration schema & storage policies
├── capacitor.config.json   # Native mobile packaging configuration
└── package.json            # Scripts and project dependencies
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for personal, educational, and open-source use.
