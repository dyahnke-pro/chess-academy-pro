# Stockfish init timeout — production diagnostic (post #337)

PR #337 shipped to `main` (commit `13525c4`) and Stockfish initialization
times out at 45s on https://chess-academy-pro.vercel.app/. Console shows
`[Stockfish] Initializing worker...` followed by
`Stockfish initialization timed out after 45s`, the crash-recovery layer
retries, and the second attempt also times out. Crash recovery from #337
is working; the engine itself never reaches `readyok`.

Diagnostic-only — no fixes in this branch.

---

## (1) COOP/COEP headers configured

`cat vite.config.ts vercel.json | grep -B2 -A5 "Cross-Origin-Opener-Policy|Cross-Origin-Embedder-Policy|COOP|COEP|headers"`

```
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
{
--
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

Headers are configured at both `vite.config.ts` (dev/preview) and
`vercel.json` (app-wide `/(.*)` source). Configuration is present.
What's NOT verified here: whether the actual production response
headers from `https://chess-academy-pro.vercel.app/` include them, and
whether `crossOriginIsolated === true` in the runtime page context.

---

## (2) Which Stockfish bundle PR #337 shipped

`ls -la public/stockfish/`

```
total 12
drwxr-xr-x 2 root root 4096 Apr 25 19:50 .
drwxr-xr-x 4 root root 4096 Apr 25 19:50 ..
-rw-r--r-- 1 root root 1101 Apr 25 19:50 README.md
```

`public/stockfish/` contains only the README in this checkout —
expected, because the bundle is copied at install time by the
`postinstall` → `stockfish:copy` script (and `validate-stockfish.cjs`
auto-copies on `prebuild`). The Vercel build runs both, so the bundle
will be in production. (`node_modules/` is not installed in this
sandbox, hence the empty directory here.)

`grep -rn "stockfish-" src/services/stockfishEngine.ts src/services/stockfishCache.ts src/services/stockfishWorker.ts`

```
src/services/stockfishEngine.ts:32:const WORKER_URL = '/stockfish/stockfish-18-lite.js';
src/services/stockfishEngine.ts:211:          kind: 'stockfish-cache-hit',
src/services/stockfishEngine.ts:219:        kind: 'stockfish-cache-miss',
src/services/stockfishEngine.ts:354:        kind: 'stockfish-cache-hit',
```

PR #337 diff (package.json):

```diff
-    "stockfish:copy": "mkdir -p public/stockfish && cp node_modules/stockfish/bin/stockfish-18-lite-single.js public/stockfish/ && cp node_modules/stockfish/bin/stockfish-18-lite-single.wasm public/stockfish/",
+    "stockfish:copy": "mkdir -p public/stockfish && cp node_modules/stockfish/bin/stockfish-18-lite.js public/stockfish/ && cp node_modules/stockfish/bin/stockfish-18-lite.wasm public/stockfish/",
```

PR #337 diff (stockfishEngine.ts):

```diff
-        this.worker = new Worker('/stockfish/stockfish-18-lite-single.js');
+        this.worker = new Worker(WORKER_URL);
```

Where `WORKER_URL = '/stockfish/stockfish-18-lite.js'`.

The swap is from `stockfish-18-lite-single.js` (single-threaded, does
NOT need SharedArrayBuffer) to `stockfish-18-lite.js` (multi-threaded,
REQUIRES SharedArrayBuffer + a `crossOriginIsolated` page context).
Same npm package (`stockfish@18.0.5`), different bundle variant.

`validate-stockfish.cjs` confirms it ships only the multi-thread
variant — no fallback to the single-thread bundle is staged:

```
const REQUIRED_FILES = [
  { name: 'stockfish-18-lite.js', minSize: 10_000 },
  { name: 'stockfish-18-lite.wasm', minSize: 1_000_000 },
];
```

---

## (3) Worker URL and initialization sequence

`src/services/stockfishEngine.ts:74-158`:

```
async initialize(): Promise<void> {
    if (this._permanentlyUnavailable) {
      throw new Error('Stockfish engine unavailable (exhausted crash retries)');
    }
    if (this.initPromise) return this.initPromise;

    this.setStatus('loading');
    console.log('[Stockfish] Initializing worker...');

    this.initPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const msg = 'Stockfish initialization timed out after 45s';
        console.error('[Stockfish]', msg);
        this.setStatus('error', msg);
        reject(new Error(msg));
      }, INIT_TIMEOUT_MS);

      try {
        this.worker = new Worker(WORKER_URL);

        this.worker.onmessage = (event: MessageEvent<string>) => {
          this.handleMessage(event.data);
        };

        this.worker.onerror = (error) => {
          clearTimeout(timeoutId);
          const msg =
            error.message ||
            'Uncaught RuntimeError or worker load failure';
          console.error('[Stockfish] worker.onerror:', msg);
          this.setStatus('error', msg);
          this.initPromise = null;
          reject(new Error(msg));
        };

        // Multi-threaded NNUE init flow:
        //   send `uci` → wait for `uciok` → send setoption Threads/Hash/MultiPV
        //   → send `isready` → wait for `readyok`
        const threadCount =
          (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
        const hashMb = 64;

        const initHandler = (event: MessageEvent<string>): void => {
          if (event.data === 'uciok') {
            this.send(`setoption name Threads value ${threadCount}`);
            this.send(`setoption name Hash value ${hashMb}`);
            this.send('setoption name MultiPV value 3');
            console.log(
              `[Stockfish] threads=${threadCount} hash=${hashMb}MB`,
            );
            this.send('isready');
            return;
          }
          if (event.data === 'readyok') {
            clearTimeout(timeoutId);
            this.worker?.removeEventListener('message', initHandler);
            this.isReady = true;
            this._crashRetries = 0;
            console.log('[Stockfish] Engine ready (lite multi-threaded WASM)');
            this.setStatus('ready');
            resolve();
          }
        };

        this.worker.addEventListener('message', initHandler);
        this.send('uci');
      } catch (error) {
        clearTimeout(timeoutId);
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Stockfish] Init error:', msg);
        this.setStatus('error', msg);
        this.initPromise = null;
        reject(error instanceof Error ? error : new Error(msg));
      }
    });

    return this.initPromise.catch((err) => {
      this.handleWorkerCrash(err instanceof Error ? err.message : String(err));
      throw err;
    });
  }
```

Constants in the same file:

```
const INIT_TIMEOUT_MS = 45_000;
const WORKER_URL = '/stockfish/stockfish-18-lite.js';
const MAX_CRASH_RETRIES = 3;
```

Key observations on this flow:

1. There is **no per-step timeout** on `uci → uciok` or `isready → readyok` —
   only one overall 45s wall clock.
2. There is **no feature gate** before `new Worker(WORKER_URL)` — the
   code never inspects `crossOriginIsolated` or
   `typeof SharedArrayBuffer` before attempting to spawn the
   multi-threaded build.
3. `worker.onerror` only fires if the worker script fails to load or
   throws synchronously. The Stockfish 18 multi-thread bundle's
   pthread spawn happens inside the WASM runtime; if SAB is missing,
   the bundle can hang (waiting on threads that will never come)
   rather than throwing.
4. The `[Stockfish] threads=N hash=64MB` log line and the
   `[Stockfish] Engine ready (lite multi-threaded WASM)` log line are
   ONLY emitted on `uciok` and `readyok` respectively. Neither
   appears in the user's production console — meaning the worker
   never returns `uciok`. The hang is between
   `new Worker(WORKER_URL)` and the first `uciok` message.

---

## (4) SharedArrayBuffer / crossOriginIsolated feature detection

`grep -rn "SharedArrayBuffer\|crossOriginIsolated" src/`

```
(no output)
```

**Zero matches.** The codebase does not check for SharedArrayBuffer
availability or page cross-origin-isolation status anywhere before
instantiating the multi-threaded worker. There is also no
fallback path to `stockfish-18-lite-single.js` if SAB is unavailable.

---

## (5) vercel.json full config

`cat vercel.json`

```
{
  "rewrites": [
    { "source": "/voice-packs/:file", "destination": "/api/voice-packs/:file" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

Two interactions worth noting:

- The catch-all rewrite `/((?!api/).*)` → `/index.html` is the SPA
  rewrite. Vercel evaluates real static files in `public/` BEFORE
  rewrites, so a present `/stockfish/stockfish-18-lite.js` will be
  served as-is. But if the file is missing (e.g. validator silently
  skipped, or directory not in the deployed build output), the
  request would rewrite to `/index.html` and the `Worker` would
  attempt to parse HTML as JavaScript — that produces a
  `worker.onerror` load failure within milliseconds, NOT a 45s hang.
  The observed 45s timeout argues AGAINST this scenario.
- The COOP/COEP headers source `/(.*)` covers everything including
  `/stockfish/*`. No `Cross-Origin-Resource-Policy` is set anywhere,
  meaning cross-origin sub-resources fetched by the page (Polly TTS
  audio CDN, Lichess thumbnails, third-party fonts, analytics) need
  to send `CORP: cross-origin` themselves OR be loaded with
  `crossorigin` attribute, or COEP `require-corp` will block them
  AND, depending on the asset, can also prevent the page from
  reaching `crossOriginIsolated` state.

---

## Diagnosis

The most likely cause is that the production page is **not actually
`crossOriginIsolated`** at runtime, even though COOP/COEP headers are
configured at every layer we control. The PR #337 commit body itself
flags this risk: *"App-wide COOP/COEP can block cross-origin assets
without CORP headers (Polly TTS audio, Lichess thumbnails, fonts).
Patch as breakage surfaces."* The multi-threaded `stockfish-18-lite.js`
bundle requires `SharedArrayBuffer`, which Chrome only exposes when
`window.crossOriginIsolated === true`. If even one cross-origin
sub-resource on the page (Polly audio fetch, Lichess CDN image, Google
Fonts CSS, an analytics or error-reporting script) is requested
without a matching `Cross-Origin-Resource-Policy: cross-origin` header
or a `crossorigin` attribute on the loading tag, COEP `require-corp`
either blocks the resource or downgrades the page out of cross-origin
isolation. With SAB unavailable, the multi-threaded WASM bundle's
pthread initialization stalls in the runtime — the worker never sends
`uciok`, `worker.onerror` never fires (the worker is alive but stuck
inside pthread spawn), and the only signal is the single 45s
`INIT_TIMEOUT_MS` wall clock. This is consistent with the user's
console: no `[Stockfish] threads=N hash=64MB` line (only emitted on
`uciok`), no `[Stockfish] Engine ready` line, and no
`worker.onerror` log — just a clean 45s hang. Compounding the issue,
the codebase has zero `SharedArrayBuffer` / `crossOriginIsolated`
feature detection (section 4) and no fallback path to
`stockfish-18-lite-single.js`, so a runtime-isolation failure has no
graceful degradation — it can only manifest as a timeout. Verification
steps before any fix: (a) `curl -I https://chess-academy-pro.vercel.app/`
to confirm COOP/COEP arrive in the actual production response;
(b) open DevTools on the production app and evaluate
`window.crossOriginIsolated` and `typeof SharedArrayBuffer` — if the
former is `false` or the latter is `'undefined'`, this diagnosis is
confirmed; (c) check the Network tab for any cross-origin asset whose
response is missing `Cross-Origin-Resource-Policy` (likely culprits:
Polly audio URLs, `lichess1.org` thumbnail CDN, Google Fonts,
analytics). The fix path — explicitly out of scope for this branch —
is some combination of: add a SAB feature gate that falls back to
`stockfish-18-lite-single.js`, restore single-thread as the default
until cross-origin assets are CORP-clean, or proxy the offending
cross-origin assets through `/api/` so they originate from
chessacademy.pro itself.
