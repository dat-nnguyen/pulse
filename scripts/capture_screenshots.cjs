const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    show: false,
    webPreferences: {
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const outDir = path.join(__dirname, '../docs/assets');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    console.log('1. Loading app...');
    await win.loadURL('http://localhost:5173');
    await new Promise(r => setTimeout(r, 1500));

    console.log('2. Seeding high-res demo tracks into IndexedDB...');
    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const req = indexedDB.open('PulseAudioDB', 2);
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['tracks', 'playlists'], 'readwrite');
          const trackStore = tx.objectStore('tracks');
          const playlistStore = tx.objectStore('playlists');

          const tracks = [
            {
              id: 'trk_1',
              title: 'Starboy (Lossless Master)',
              artist: 'The Weeknd, Daft Punk',
              album: 'Starboy',
              duration: 230,
              coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
              audioUrl: 'https://cdn.freesound.org/previews/560/560446_11861866-lq.mp3',
              isDownloaded: true,
              addedAt: Date.now() - 50000
            },
            {
              id: 'trk_2',
              title: 'Resonance',
              artist: 'HOME',
              album: 'Odyssey (24-bit FLAC)',
              duration: 212,
              coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80',
              audioUrl: 'https://cdn.freesound.org/previews/560/560446_11861866-lq.mp3',
              isDownloaded: true,
              addedAt: Date.now() - 40000
            },
            {
              id: 'trk_3',
              title: 'Midnight City',
              artist: 'M83',
              album: 'Hurry Up, We\\'re Dreaming',
              duration: 243,
              coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
              audioUrl: 'https://cdn.freesound.org/previews/560/560446_11861866-lq.mp3',
              isDownloaded: true,
              addedAt: Date.now() - 30000
            },
            {
              id: 'trk_4',
              title: 'After Dark',
              artist: 'Mr.Kitty',
              album: 'Time',
              duration: 259,
              coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
              audioUrl: 'https://cdn.freesound.org/previews/560/560446_11861866-lq.mp3',
              isDownloaded: true,
              addedAt: Date.now() - 20000
            },
            {
              id: 'trk_5',
              title: 'Instant Crush',
              artist: 'Daft Punk ft. Julian Casablancas',
              album: 'Random Access Memories (Studio FLAC)',
              duration: 337,
              coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
              audioUrl: 'https://cdn.freesound.org/previews/560/560446_11861866-lq.mp3',
              isDownloaded: true,
              addedAt: Date.now() - 10000
            }
          ];

          tracks.forEach(t => trackStore.put(t));

          const playlist = {
            id: 'pl_favorites',
            name: '✨ High-Fidelity Favorites',
            description: 'Bit-perfect 320kbps & 24-bit Lossless Studio Masters',
            trackIds: ['trk_1', 'trk_2', 'trk_3', 'trk_4', 'trk_5'],
            coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
            createdAt: Date.now()
          };
          playlistStore.put(playlist);

          tx.oncomplete = () => resolve(true);
        };
      });
    `);

    console.log('3. Reloading page with populated library...');
    await win.loadURL('http://localhost:5173');
    await new Promise(r => setTimeout(r, 1500));

    // Open the seeded playlist
    await win.webContents.executeJavaScript(`
      const plBtn = Array.from(document.querySelectorAll('button, div, span')).find(el => el.textContent.includes('High-Fidelity Favorites') || el.textContent.includes('All Tracks'));
      if (plBtn) plBtn.click();
    `);
    await new Promise(r => setTimeout(r, 800));

    // Play first track
    await win.webContents.executeJavaScript(`
      const playBtn = document.querySelector('button.play-btn-large') || document.querySelector('button[aria-label*="Play"]') || document.querySelector('.track-row button');
      if (playBtn) playBtn.click();
    `);
    await new Promise(r => setTimeout(r, 1200));

    // 1. Desktop hero player screenshot
    const image1 = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'desktop-hero.png'), image1.toPNG());
    console.log('Saved desktop-hero.png');

    // 2. Open Equalizer modal
    await win.webContents.executeJavaScript(`
      const eqBtn = document.querySelector('button[title*="Equalizer"]') || document.querySelector('button[aria-label*="Equalizer"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Equalizer') || b.querySelector('svg.lucide-sliders'));
      if (eqBtn) eqBtn.click();
    `);
    await new Promise(r => setTimeout(r, 800));
    const image2 = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'equalizer-modal.png'), image2.toPNG());
    console.log('Saved equalizer-modal.png');

    // Close Equalizer modal
    await win.webContents.executeJavaScript(`
      const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Done');
      if (doneBtn) doneBtn.click();
    `);
    await new Promise(r => setTimeout(r, 500));

    // 3. Search and Ingestion view with query
    await win.webContents.executeJavaScript(`
      const dlBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.includes('Download') || b.textContent.includes('Add Audio'));
      if (dlBtn) dlBtn.click();
    `);
    await new Promise(r => setTimeout(r, 800));

    // Type trending query into search bar
    await win.webContents.executeJavaScript(`
      const input = document.querySelector('input[placeholder*="Search songs"]');
      if (input) {
        input.value = 'Daft Punk - Random Access Memories';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await new Promise(r => setTimeout(r, 400));
    const image3 = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'downloader-view.png'), image3.toPNG());
    console.log('Saved downloader-view.png');

    // 4. Mobile viewport with populated tracks
    win.setSize(390, 844);
    await win.webContents.executeJavaScript(`
      const homeBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.includes('Playlists') || b.title?.includes('Home'));
      if (homeBtn) homeBtn.click();
    `);
    await new Promise(r => setTimeout(r, 800));
    const image4 = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'mobile-home.png'), image4.toPNG());
    console.log('Saved mobile-home.png');

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    app.quit();
  }
});
