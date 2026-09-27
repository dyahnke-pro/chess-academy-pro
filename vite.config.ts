import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, relative, resolve as resolvePath, sep } from 'node:path';

/** Legacy auto-annotations live in src/ (tests and scripts read them there)
 *  but are SERVED as `/data/annotations/<id>.json`, fetched per opening on
 *  demand — no longer compiled into 1,889 JS chunks. See
 *  src/data/annotations/index.ts. */
const ANNOTATIONS_SRC = 'src/data/annotations';
/** Directories whose files share ONE version entry, so the per-session
 *  version file stays small (1,889 annotation files would otherwise add 1,889
 *  entries). A change to any file re-versions the directory. */
const VERSIONED_AS_DIRECTORY = ['/data/annotations/'];

function copyAnnotations(root: string, outDir: string): void {
  const from = join(root, ANNOTATIONS_SRC);
  const to = join(outDir, 'data', 'annotations');
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    if (name.endsWith('.json')) copyFileSync(join(from, name), join(to, name));
  }
}

/** Content hash of every file under `<outDir>/data`, keyed by its `/data/...`
 *  path. Written to `<outDir>/data-versions.json` so the native app can tell
 *  whether a data file it downloaded and kept is still current
 *  (src/services/dataFile.ts). Pure function of the file bytes — an
 *  unchanged file keeps its hash across builds. */
function writeDataVersions(outDir: string): void {
  const dataDir = join(outDir, 'data');
  if (!existsSync(dataDir)) return;
  const versions: Record<string, string> = {};
  const dirHashes = new Map(VERSIONED_AS_DIRECTORY.map((d) => [d, createHash('sha256')]));
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      const path = '/' + relative(outDir, full).split(sep).join('/');
      const bytes = readFileSync(full);
      const group = VERSIONED_AS_DIRECTORY.find((d) => path.startsWith(d));
      if (group) {
        dirHashes.get(group)!.update(path).update(bytes);
        continue;
      }
      versions[path] = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    }
  };
  walk(dataDir);
  for (const [dir, h] of dirHashes) versions[dir] = h.digest('hex').slice(0, 16);
  const sorted = Object.fromEntries(Object.entries(versions).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(outDir, 'data-versions.json'), JSON.stringify(sorted));
}

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
  // SECURITY (2026-06-09): provider API keys must NOT be exposed to the
  // client. Do NOT add 'ANTHROPIC_'/'DEEPSEEK_' to loadEnv or envPrefix and
  // do NOT `define` __ANTHROPIC_KEY__/__DEEPSEEK_KEY__ — that inlined the
  // keys into the public bundle and a scraped key got siphoned. Provider
  // calls now go through the server-side proxy api/llm-proxy.ts, which reads
  // the keys from process.env at runtime. The keys live ONLY in Vercel's
  // server env, never the bundle.
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'AUDIT_']);
  const buildId = resolveBuildId();
  return {
  envPrefix: ['VITE_'],
  define: {
    // Baked-in audit-stream defaults. These no longer ENABLE anything —
    // streaming is opt-in and OFF by default as of 2026-09-11 (David: "i only
    // want the live audit stream to send to redis when i turn it on"). They are
    // the value the Settings panel offers for one-tap enable, and the secret the
    // 401 auto-heal adopts when a device carries a pre-rotation one.
    //
    // (Superseded: this used to read "so EVERY device streams without per-device
    // opt-in, David's call 2026-05-27". That is why the shared Upstash budget —
    // which also holds the spend guard, the bell's messages and the referral
    // credits — was exhausted in July and again in September.)
    //
    // The secret still ships in the client bundle; it is a low-stakes shared
    // secret gated by a per-IP rate limit.
    __AUDIT_STREAM_URL__: JSON.stringify(
      env.AUDIT_STREAM_URL || process.env.AUDIT_STREAM_URL || 'https://chess-academy-pro.vercel.app/api/audit-stream',
    ),
    __AUDIT_STREAM_SECRET__: JSON.stringify(env.AUDIT_STREAM_SECRET || process.env.AUDIT_STREAM_SECRET || ''),
  },
  plugins: [
    react(),
    // The build id lives in index.html, NEVER in a JS chunk (2026-09-26).
    // It changes on every build (`Date.now()`), so while it was a `define`
    // inlined into appAuditor's chunk it renamed that chunk and every chunk
    // importing it by hashed name — 142 files / 8.7 MB — on a build whose
    // code had not changed at all, and every OTA shipped them. index.html
    // already changes on every build, so the stamp costs nothing there.
    // Read back by `appAuditor.getBuildId()`. Gate: buildIdNotInJs.test.ts.
    (() => {
      // Served data files: copy the annotations in, then write the version
      // map the native app uses to tell a kept copy went stale. ONE plugin so
      // the order is guaranteed (Rollup runs closeBundle hooks in parallel).
      // closeBundle, not writeBundle: `public/` must already be copied in.
      let outDir = 'dist';
      let root = process.cwd();
      let isBuild = false;
      return {
        name: 'data-files',
        configResolved(c: { root: string; command: string; build: { outDir: string } }) {
          root = c.root;
          isBuild = c.command === 'build';
          outDir = resolvePath(c.root, c.build.outDir);
        },
        configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: Buffer) => void }, next: () => void) => void) => void } }) {
          // Dev server: serve /data/annotations/<id>.json straight from src.
          server.middlewares.use((req, res, next) => {
            const m = /^\/data\/annotations\/([A-Za-z0-9_.-]+\.json)(?:\?.*)?$/.exec(req.url ?? '');
            const file = m ? join(root, ANNOTATIONS_SRC, m[1]) : '';
            if (!m || !existsSync(file)) { next(); return; }
            res.setHeader('content-type', 'application/json');
            res.end(readFileSync(file));
          });
        },
        closeBundle() {
          if (!isBuild) return;
          copyAnnotations(root, outDir);
          writeDataVersions(outDir);
        },
      };
    })(),
    {
      // NO STATIC IMPORT CYCLE BETWEEN CHUNKS — the build FAILS on one.
      //
      // 2026-09-26: splitting lesson data out of the entry put a shared helper
      // where `appdata-lessons` and `app-vendor` imported EACH OTHER. Across
      // chunks a cycle can evaluate a module before the one it depends on, so
      // prod threw "Cannot access 'B0' before initialization" and rendered a
      // blank page for ~10 minutes. Every test was green: nothing checked the
      // BUILT chunk graph. This does. Measured: the broken build had exactly 1
      // cycle, the healthy build has 0 — so this cannot fire on a good build.
      // (It replaces a narrower check that only looked for data→entry
      // imports, and so passed the cycle that shipped.)
      name: 'no-chunk-import-cycles',
      apply: 'build',
      generateBundle(_opts, bundle) {
        const imports = new Map<string, string[]>();
        for (const c of Object.values(bundle)) if (c.type === 'chunk') imports.set(c.fileName, c.imports);
        const state = new Map<string, 1 | 2>();
        const found: string[][] = [];
        const visit = (n: string, stack: string[]): void => {
          state.set(n, 1);
          stack.push(n);
          for (const m of imports.get(n) ?? []) {
            if (state.get(m) === 1) found.push([...stack.slice(stack.indexOf(m)), m]);
            else if (!state.has(m)) visit(m, stack);
          }
          stack.pop();
          state.set(n, 2);
        };
        for (const n of imports.keys()) if (!state.has(n)) visit(n, []);
        if (found.length > 0) {
          this.error(`static import cycle between chunks (boots in the wrong order): ${found.map((c) => c.join(' -> ')).join(' ; ')}`);
        }
      },
    },
    {
      name: 'build-id-meta',
      transformIndexHtml() {
        return [{ tag: 'meta', attrs: { name: 'app-build-id', content: buildId }, injectTo: 'head' }];
      },
    },
    VitePWA({
      // 🔒 'prompt', NOT 'autoUpdate' — and the name is load-bearing, not a
      // preference. vite-plugin-pwa FORCES `workbox.skipWaiting = true` and
      // `workbox.clientsClaim = true` whenever registerType is 'autoUpdate'
      // and injectRegister is auto/unset (node_modules/vite-plugin-pwa/dist/
      // index.js:874-876), OVERWRITING whatever this config says. So setting
      // the two flags false below while leaving 'autoUpdate' here would read
      // as fixed and ship as broken. The flags and the registerType are ONE
      // decision; change them together or not at all.
      //
      // What the injected registration does is unchanged either way: with
      // injectRegister unset and nothing importing `virtual:pwa-register`,
      // the plugin emits the SIMPLE `registerSW.js` (a bare
      // `navigator.serviceWorker.register('/sw.js')`) in both modes. Nothing
      // client-side sends SKIP_WAITING on its own; index.html does, on our
      // terms.
      registerType: 'prompt',
      workbox: {
        // 🔒🔒 A NEW SERVICE WORKER MUST NEVER TAKE OVER A RUNNING PAGE
        // (2026-09-19, after the app froze on David's iPhone mid-session).
        //
        // These were both `true`. The sequence it produced: a new SW
        // installs → `skipWaiting` activates it immediately →
        // `cleanupOutdatedCaches` DELETES the precache the running page is
        // still executing out of → `clientsClaim` takes control of that page
        // → every later chunk/worker fetch asks for a hashed file the deploy
        // no longer serves. The page is running code that has been deleted
        // underneath it. His audit trail caught it in three seconds:
        // `stockfish-error` (worker load failure), `lichess-error TypeError:
        // Load failed`, `sw-lifecycle installed → activating →
        // controllerchange → activated`, `pagehide persisted=false`, and no
        // `app-boot` on reopen — a cache left inconsistent enough that the
        // app could not boot from it at all.
        //
        // `__HOLD_SW_RELOAD__` (src/utils/swReloadHold.ts) was the previous
        // answer and it made this WORSE, which is the whole lesson: it
        // deferred the RELOAD while the activation went ahead, so it kept a
        // page alive precisely when that page's code had just been purged.
        // A watcher standing downstream of the damage. The handover is now
        // gated at the source — see index.html: the hold decides whether we
        // ASK the waiting worker to take over; once it HAS taken over the
        // reload is immediate and unconditional, because by then the old
        // bundle is already gone.
        //
        // Cost accepted: a new deploy lands on the next quiet moment (or the
        // next cold open) instead of instantly. `cleanupOutdatedCaches` stays
        // correct — it now runs at an activation we chose.
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        // Safety ceiling on precached file size. The heavy data JSON are now
        // split into `appdata-*` chunks (see manualChunks below), so no single
        // file comes close to this — it's a guard against an accidental giant
        // asset, not the load-bearing limit it used to be when everything
        // inlined into one ~10 MB `index` chunk (WO-PERF-BUNDLE-01).
        // Bumped 8→14 MiB (David 2026-09-09): the `index` chunk crept to 8.39 MB
        // and vite-plugin-pwa THROWS (fatal) when a precache asset exceeds this,
        // so the build failed on Vercel while warning-only locally. Headroom until
        // the index is split further (it should be — 8 MB main bundle is heavy).
        maximumFileSizeToCacheInBytes: 14 * 1024 * 1024,
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
            // Legacy per-opening annotations (`/data/annotations/<id>.json`,
            // 2026-09-26). Their OWN cache, listed BEFORE the /data/ rule: up
            // to 1,889 small files would otherwise evict the masters DB from
            // that rule's 20-entry cache.
            urlPattern: /\/data\/annotations\/.*\.json$/i,
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'annotation-cache',
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
              // 20, not 5. The comment above still describes the day this rule
              // was written, when `/data/` held essentially one file. It now
              // holds ELEVEN — the masters DB, the spoken bake, the play DB,
              // the game references, and six teaching corpora — so a 5-entry
              // LRU had them evicting each other, and a phone re-fetched
              // whichever ones lost. Silent, because nothing fails: the SW
              // simply goes back to the network and the user pays for it again.
              //
              // The cap exists to bound disk, and these are served brotli'd
              // (~10-12 MB for the whole set), so 20 is comfortable and leaves
              // room for the next corpus without re-introducing the thrash.
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 },
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
          // Real PNG icons (generated by `node scripts/build-app-icon.mjs`
          // from the gold-knight brand mark). PNG first so installers that
          // ignore SVG icons (iOS Safari add-to-home, some Android launchers)
          // get a real raster icon instead of the old 404 / placeholder.
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          // SVG kept as a progressive enhancement for installers that prefer
          // vector (crisp at any density).
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
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
            // The frequency-derived subline data + the hand-authored subline
            // narration prose (the three `sublineNarration*` group files, ~0.5 MB
            // and growing as each group is authored). Kept out of the entry chunk
            // so narration growth lands here instead of re-bloating `index` past
            // the Workbox precache cap — the exact regression WO-PERF-BUNDLE-01
            // guards against, retriggered when the new subline data was added
            // without a matching chunk rule.
            if (id.includes('course-sublines.json')) return 'appdata-sublines';
            // The Danya teaching corpus (~3 MB source, grows with every
            // distillation wave) — same regression class: without a chunk
            // rule it inlined into `index`, pushed it to 9.9 MB, and broke
            // every deploy after 2026-07-12 wave 6.
            if (id.includes('danya-teachings.json')) return 'appdata-danya';
            // The voiced-walkthrough corpus (merged DNA beats → branching
            // trees, one per opening). Grows as more videos are voiced; same
            // regression class — without a chunk rule it inlined into `index`
            // and pushed it past the 8 MiB Workbox precache cap.
            if (id.includes('voiced-walkthroughs.json')) return 'appdata-voiced';
            if (id.includes('voiced-matchups.json')) return 'appdata-voiced';
            // 🔒 THERE IS ONE CORPUS SOURCE (David 2026-09-21): danya's, plus
            // the hand-authored VOICED corpus. The seven farmed creators
            // (chessbrah, hangingpawns, saintlouis, gothamchess, hikaru,
            // imrosen, magnuscarlsen) were removed, and the
            // `appdata-chessbrah` rule that stood here with them — a chunk
            // rule for a file that no longer exists is dead weight that reads
            // like a live constraint. Danya's floating half and voiced are
            // FETCHED from `public/data/`, so neither needs a rule.
            if (id.includes('/lessons/sublineNarration')) return 'appdata-subline-narration';
            if (id.includes('model-games.json')) return 'appdata-modelgames';
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
