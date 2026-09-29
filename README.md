# 🎵 Aura — Lossless Audio Lounge

> **Personal, ad-free, high-fidelity music & podcast player for Mac, iPhone, and Android.**  
> Zero subscriptions. Zero advertisements. Bit-perfect original audio with continuous background lock-screen playback.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## ✨ Features

- **💎 Bit-Perfect High-Fidelity Audio**: Preserves original 320kbps MP3, FLAC (24-bit lossless), WAV, and M4A audio without lossy re-encoding or artificial degradation.
- **📱 Background Lock-Screen Playback (iPhone & Android)**: Keeps playing continuously when your phone screen turns off, locks, or you switch apps. Full native lock screen media controls (album artwork, scrub bar, play/pause/skip).
- **💻 Desktop Background Audio (macOS & Windows)**: Music continues uninterrupted when the app or browser window is minimized or hidden.
- **📥 Music & Podcast Ingestion Engine**:
  - **YouTube & Web Audio**: Ingest from YouTube, SoundCloud, or direct audio links in 320kbps master quality.
  - **Apple Podcasts Directory & RSS**: Search millions of podcasts, stream live, or download episodes offline.
  - **Local Audio Drag-and-Drop**: Drop your existing `.mp3`, `.flac`, `.wav`, or `.m4a` files with automatic metadata extraction.
- **💾 100% Offline Vault**: Downloaded audio is stored in your device's local IndexedDB storage. Listen anywhere on airplanes or off-grid without data usage.
- **🎛️ Hardware-Accelerated Equalizer**: 5-band Web Audio EQ (60Hz, 250Hz, 1kHz, 4kHz, 16kHz), Bass Boost control, presets (*Bass Boost, Vocal, Acoustic, Rock, Electronic, Flat, Treble Boost*), and real-time live spectrum visualizer canvas.
- **🎤 Synchronized Karaoke Lyrics**: Synced `.lrc` lyrics with real-time active line highlighting, smooth auto-scroll, and click-to-seek functionality.
- **🤝 Zero-Friction Sharing**: Share a simple URL with friends. They can install it immediately on iOS or Android as a standalone PWA with zero App Store fees or ads.

---

## 🚀 Quick Start (Local)

### Prerequisites

- Node.js 18+ (tested on Node.js 20 and 26)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/dat-nnguyen/real-free-music-player.git
cd real-free-music-player

# Install dependencies
npm install

# Start the development server (binds to 0.0.0.0 for mobile network access)
npm run dev
```

- Open **[http://localhost:5173](http://localhost:5173)** on your Mac or PC.
- Open **`http://<your-mac-ip>:5173`** on your iPhone or Android phone connected to the same Wi-Fi.

### Production Run

```bash
# Build frontend and launch the unified production server on port 3001
npm run start
```

---

## 🐳 Self-Hosting with Docker

The fastest way to deploy your personal music server on a VPS, home lab, or Synology NAS:

```bash
# Start with Docker Compose
docker compose up -d
```

Your server will be running on `http://localhost:3001` with `audio_cache` persistent storage.

---

## 📲 Mobile Installation Guide

### Apple iPhone (iOS)

1. Open the player URL in **Safari**.
2. Tap the **Share** button (box with upward arrow).
3. Scroll down and tap **"Add to Home Screen"**.
4. The app launches full-screen with no browser borders and plays continuously with lock-screen controls when your iPhone screen is turned off.

### Android (Chrome / Brave / Edge)

1. Open the player URL in **Chrome**.
2. Tap the **⋮ (Menu)** button in the top right.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. Aura runs as a native standalone app with background notification media controls.

---

## 🛠️ Native iOS Xcode Build

A pre-configured Capacitor iOS project with native background audio entitlements (`UIBackgroundModes: ["audio"]` and `AVAudioSessionCategoryPlayback`) is included in `ios/App/App`:

```bash
# Sync web build to iOS
npm run ios:sync

# Open in Xcode (requires Mac with Xcode installed)
npm run ios:open
```

You can build and deploy the `.ipa` directly to your iPhone via Xcode, AltStore, or Sideloadly.

---

## 📁 Architecture Overview

```text
├── public/                 # Static assets, PWA manifest, service worker
│   ├── favicon.svg         # Signature Aura glowing soundwave icon
│   ├── manifest.json       # Web App Manifest (Android & iOS PWA)
│   └── sw.js               # Offline caching service worker
├── server/                 # Production Node.js backend
│   ├── config/             # Environment & path configuration
│   ├── controllers/        # Download, podcast, and lyrics controllers
│   ├── middleware/         # Security, CORS, and error handlers
│   ├── routes/             # Clean REST API endpoints
│   ├── services/           # Audio extraction, RSS parser, and lyrics API
│   └── server.js           # Production Express app
├── src/                    # Frontend React application
│   ├── components/         # Aura UI components (Soundstage, Dock, Modals)
│   ├── services/           # AudioEngine, IndexedDB storage, Web Audio EQ
│   ├── App.jsx             # Master application coordinator
│   └── index.css           # Bespoke Aura design tokens & glassmorphism
├── Dockerfile              # Multi-stage production container
├── docker-compose.yml      # 1-command container orchestration
└── capacitor.config.json   # Native mobile configuration
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for personal, educational, and commercial open-source use.
