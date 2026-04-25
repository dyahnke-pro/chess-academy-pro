import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'ANTHROPIC_', 'DEEPSEEK_']);
  // Release tag for Sentry. Vercel exposes the commit SHA on build; fall
  // back to a local placeholder so non-Vercel builds still compile. Must
  // match the `release` passed to Sentry.init() in src/services/sentry.ts.
  const release =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VITE_APP_VERSION ??
    'local';
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
  const sentryOrg = process.env.SENTRY_ORG;
  const sentryProject = process.env.SENTRY_PROJECT;
  // Only upload source maps when the full credential set is present —
  // absence is not an error (PR previews and local builds both skip it).
  const sentryUploadEnabled = Boolean(
    sentryAuthToken && sentryOrg && sentryProject,
  );
  return {
  envPrefix: ['VITE_', 'ANTHROPIC_', 'DEEPSEEK_'],
  define: {
    __ANTHROPIC_KEY__: JSON.stringify(env.ANTHROPIC_KEY || process.env.ANTHROPIC_KEY || ''),
    __DEEPSEEK_KEY__: JSON.stringify(env.DEEPSEEK_KEY || process.env.DEEPSEEK_KEY || ''),
    // Expose the commit SHA to runtime code so Sentry's `release` tag
    // (set in initSentry()) matches the source maps uploaded at build.
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(release),
  },
  plugins: [
    react(),
    // Uploads source maps to Sentry and tags them with the release. Must
    // run AFTER the bundler has emitted the maps — the plugin handles the
    // ordering internally. Silently skips upload when creds are missing.
    ...(sentryUploadEnabled
      ? [
          sentryVitePlugin({
            org: sentryOrg,
            project: sentryProject,
            authToken: sentryAuthToken,
            release: { name: release },
            sourcemaps: {
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
          }),
        ]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // TODO: Replace with code-splitting + exclude Stockfish WASM from precache — see backlog item WO-PERF-BUNDLE-01.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['stockfish/**'],
        navigateFallbackDenylist: [/^\/api\//, /^\/voice-packs\//],
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
    // 'hidden' emits .map files for the sentryVitePlugin to upload but
    // strips the `//# sourceMappingURL=` reference from the shipped JS
    // so browsers never download them. The plugin's
    // `filesToDeleteAfterUpload` then removes the maps from `dist`.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chess-vendor': ['chess.js', 'react-chessboard'],
          'ui-vendor': ['framer-motion', 'recharts', 'lucide-react'],
          'data-vendor': ['dexie', 'zustand'],
          // Split Sentry + PostHog off the main bundle — they're big
          // and only read at boot, so the cost of a separate chunk is
          // recouped immediately and keeps the index bundle under the
          // PWA precache ceiling.
          'observability': ['@sentry/react', 'posthog-js'],
        },
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/api/**'],
    },
    proxy: {
      '/api': {
        target: 'https://chess-academy-pro.vercel.app',
        changeOrigin: true,
      },
    },
  },
};
});
