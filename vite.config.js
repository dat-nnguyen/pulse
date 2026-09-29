import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
