import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['stockfish'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chess-vendor': ['chess.js', 'react-chessboard'],
          'ui-vendor': ['framer-motion', 'recharts', 'lucide-react'],
          'data-vendor': ['dexie', 'zustand'],
        },
      },
    },
  },
});
