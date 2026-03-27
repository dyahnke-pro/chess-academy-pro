import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'ANTHROPIC_', 'DEEPSEEK_']);
  return {
  envPrefix: ['VITE_', 'ANTHROPIC_', 'DEEPSEEK_'],
  define: {
    __ANTHROPIC_KEY__: JSON.stringify(env.ANTHROPIC_KEY ?? ''),
    __DEEPSEEK_KEY__: JSON.stringify(env.DEEPSEEK_KEY ?? ''),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['stockfish/**'],
        runtimeCaching: [
          {
            urlPattern: /\/stockfish\/.*/i,
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'stockfish-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Chess Academy Pro',
        short_name: 'ChessAcademy',
        description: 'AI-powered chess training with an adaptive coach',
        start_url: '/',
        id: '/',
        lang: 'en',
        dir: 'ltr',
        scope: '/',
        display: 'standalone',
        theme_color: '#c9a84c',
        background_color: '#0f0f0f',
        orientation: 'portrait-primary',
        categories: ['education', 'games', 'sports'],
        prefer_related_applications: false,
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['stockfish', 'kokoro-js'],
    include: ['openai', '@anthropic-ai/sdk'],
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
};
});
