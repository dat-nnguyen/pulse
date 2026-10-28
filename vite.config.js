import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

function offlineAssets() {
  return {
    name: 'pulse-offline-assets',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((name) => /\.(js|css)$/.test(name)).sort();
      const buildId = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12);
      this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify(assets.map((name) => `/${name}`)) });
      const worker = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker.replace('__PULSE_BUILD_ID__', buildId) });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlineAssets()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'supabase-vendor', test: /node_modules[\\/]@supabase[\\/]/ },
          ],
        },
      },
    },
  },
  envPrefix: ['VITE_', 'SUPABASE_'],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3030',
        changeOrigin: true,
      },
      '/audio': {
        target: 'http://localhost:3030',
        changeOrigin: true,
      },
    },
  },
});
