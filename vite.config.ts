import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// WO-DEEP-DIAGNOSTICS — generate a build identifier at config time so
// every build embeds a unique stamp the audit log can attribute findings
// to. Format: `<git-sha>+<unix-ms>`. Falls back to ms-only when git
// isn't available (CI without full history). Auto-stamped on every
// audit entry by appAuditor.logAppAudit so production reports answer
// "which build was the user on?" definitively.
function resolveBuildId(): string {
  let sha = '';
  try {
    sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    // Vercel build, no git in env, etc. Fall through to ms-only.
  }
  const ms = Date.now();
  return sha ? `${sha}+${ms}` : `build+${ms}`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'ANTHROPIC_', 'DEEPSEEK_']);
  const buildId = resolveBuildId();
  return {
  envPrefix: ['VITE_', 'ANTHROPIC_', 'DEEPSEEK_'],
  define: {
    __ANTHROPIC_KEY__: JSON.stringify(env.ANTHROPIC_KEY || process.env.ANTHROPIC_KEY || ''),
    __DEEPSEEK_KEY__: JSON.stringify(env.DEEPSEEK_KEY || process.env.DEEPSEEK_KEY || ''),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Safety ceiling on precached file size. The heavy data JSON are now
        // split into `appdata-*` chunks (see manualChunks below), so no single
        // file comes close to this — it's a guard against an accidental giant
        // asset, not the load-bearing limit it used to be when everything
        // inlined into one ~10 MB `index` chunk (WO-PERF-BUNDLE-01).
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
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
          {
            // Lichess piece SVGs (Staunton/Neo/Alpha/etc) load from
            // their CDN. On a flaky network the board falls back to
            // react-chessboard's "?" placeholder — production audit
            // showed the Tactics drill page rendering the entire
            // position as "?" icons. Cache them at the SW so a one-time
            // load is enough for offline / slow-network use.
            urlPattern: /^https:\/\/lichess1\.org\/assets\/piece\/.*\.svg$/i,
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'lichess-piece-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Static data JSONs served from `/public/data/` —
            // currently the 36 MB Lichess masters DB used by the
            // coach grounding pipeline (`masterPlayLookup`). Not
            // precached (it would download the whole file on every
            // PWA install and blow the workbox 10 MB cap), but once
            // the user visits any coach surface online the SW caches
            // it CacheFirst. Subsequent loads — including fully
            // offline — hit the SW cache. 90-day expiration matches
            // how often the DB is regenerated.
            urlPattern: /\/data\/.*\.json$/i,
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'opening-data-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
              matchOptions: { ignoreSearch: true },
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
        // WO-PERF-BUNDLE-01: split the heavy static data JSON into their own
        // `appdata-*` chunks. They used to inline into the single `index`
        // chunk, which crept past the Workbox precache cap and broke every
        // deploy. As named chunks no single precached file approaches the
        // limit, the index stays lean, and content growth lands in the
        // matching data chunk instead of re-bloating the entry. Pure
        // chunking — every import stays synchronous, no behaviour change.
        manualChunks(id: string): string | undefined {
          if (id.includes('/src/data/')) {
            if (id.includes('puzzles.json')) return 'appdata-puzzles';
            if (id.includes('openings-lichess.json')) return 'appdata-eco';
            if (id.includes('middlegame-plans.json')) return 'appdata-plans';
            if (id.includes('repertoire.json') || id.includes('pro-repertoires.json')) {
              return 'appdata-repertoire';
            }
            if (id.includes('chess-concepts.json') || id.includes('opening-book-pages.json')) {
              return 'appdata-book';
            }
          }
          if (id.includes('/node_modules/')) {
            if (/\/node_modules\/(react|react-dom|react-router-dom)\//.test(id)) return 'react-vendor';
            if (/\/node_modules\/(chess\.js|react-chessboard)\//.test(id)) return 'chess-vendor';
            if (/\/node_modules\/(framer-motion|recharts|lucide-react)\//.test(id)) return 'ui-vendor';
            if (/\/node_modules\/(dexie|zustand)\//.test(id)) return 'data-vendor';
          }
          return undefined;
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
    // Cross-origin isolation — required for SharedArrayBuffer, which
    // Stockfish multi-threaded WASM uses for its worker pool. Without
    // these headers the multi-threaded build silently falls back to
    // single-thread or fails to instantiate.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
};
});
