# PLAN — Native Stockfish on iOS (Capacitor plugin)

**Owner:** David · **Started:** 2026-07-05 · **Branch:** `claude/coach-learn-posthog-analysis-ijpex5`

## Why

PostHog (2026-07-05) caught the iOS asm.js Stockfish **crash-looping** on
`/coach/teach`: 45s init timeouts ("worker never signaled"), forced respawns,
budget-grace teardowns — the coach lost its grounding source and Ruth degraded
to hedged fragments + a bogus eval ("White losing by over 12 pawns").

- **Stopgap (SHIPPED, PR #782, merged `ef5652d`):** stop tearing down a
  slow-but-alive asm worker (liveness guard, asm-variant only). Cuts the
  re-parse thrash. Device-verification owed on David's next iPhone open.
- **Real cure (THIS PLAN):** run Stockfish **natively** in the iOS app instead
  of asm.js in the WKWebView. This is how chess.com / Lichess-mobile avoid the
  whole problem. David already ships a native app (TestFlight), so the only
  thing still stuck in the browser sandbox is the *engine*.

## Decisions (locked)

1. **Vendor + adapt `veloce/capacitor-stockfish`** (the Lichess-mobile bridge).
   It's Capacitor 5 + CocoaPods; our app is **Capacitor 8 + SPM**, so it can't be
   `npm install`ed — we vendor its native bridge + Stockfish 14.1 source and wrap
   them in a **local Cap-8 SPM plugin**.
2. **Engine = Stockfish 14.1, CLASSICAL eval (no NNUE net).** Build with
   `-DNNUE_EMBEDDING_OFF` and set `Use NNUE = false` at runtime. No 40 MB net to
   bundle; classical SF14 at native ARM speed is far more than enough for coach
   grounding (eval + bestmove), and it's bulletproof. NNUE net is a later upgrade.
3. **Keep the web/asm.js engine — do NOT remove it.** The product is a web app;
   `chess-academy-pro.vercel.app` + Android have no native layer and must use the
   WASM/asm.js engine. Native only swaps the engine **transport on iOS-Capacitor**,
   and asm.js stays as the iOS fallback if the native plugin fails to load.
4. **Transport seam, not a rewrite.** `stockfishEngine.ts` keeps its entire UCI
   protocol/state machine. Introduce a `Worker`-compatible adapter
   (`NativeStockfishTransport`) so the engine code is unchanged; only the
   worker-construction site chooses native-vs-Worker.
5. **Break the SPM Swift↔ObjC++ cycle.** veloce's C++ imports the Swift plugin's
   generated `-Swift.h` (fine in one CocoaPods framework, breaks as two SPM
   targets). Re-expose the engine as a **pure-C interface with a callback**
   (`sf_start(cb)`, `sf_cmd`, `sf_exit`); the Swift target depends only on that C
   header + Capacitor. No cycle.

## Architecture

```
native-plugins/capacitor-stockfish-native/
  package.json                      # local plugin, added to root deps as file:
  Package.swift                     # 2 SPM targets (C++ engine + Swift plugin)
  src/{definitions,index,web}.ts    # JS API: start()/cmd()/exit()/addListener('output')
  ios/Sources/
    StockfishEngineCore/            # C++/ObjC++ target (NO Capacitor dep)
      include/StockfishEngineCore.h # pure-C: sf_start(cb), sf_cmd, sf_exit
      StockfishEngineCore.mm        # UCI-loop thread + stdout redirect (from Stockfish.cpp)
      threadbuf.h
      sf/                           # vendored SF 14.1 src (main.cpp excluded)
    StockfishNativePlugin/          # Swift target (CAPPlugin + CAPBridgedPlugin)
      StockfishNativePlugin.swift
```

**Data flow:** JS `cmd('go depth 18')` → `Stockfish.cmd` (Swift) → `sf_cmd` (C)
→ `UCI::command` (SF). SF stdout is redirected through a `threadbuf`; a reader
thread pushes each UCI line to the C callback → Swift closure →
`notifyListeners('output', {line})` → JS listener → the engine's `onmessage`.
Identical UCI stream to the Worker.

## Transport seam (`stockfishEngine.ts`)

The ONLY `new Worker(url)` site is in `tryStart`. Introduce a factory returning a
`Worker`-shaped object (`postMessage`, `onmessage`, `onerror`,
`addEventListener('message')`, `removeEventListener`, `terminate`). Two impls:
- `WorkerTransport` — current behavior (web, Android, non-iOS, iOS fallback).
- `NativeStockfishTransport` — wraps the plugin: on construct → `plugin.start()`
  then queue `setoption name Use NNUE value false`; `postMessage(cmd)` →
  `plugin.cmd({cmd})`; `plugin.addListener('output')` → `onmessage({data:line})`;
  `terminate()` → `plugin.exit()`.
- **Selection:** native iff `Capacitor.isNativePlatform() && getPlatform()==='ios'
  && plugin registered`. `resolveWorkerUrl()` gains an `'ios-native'` variant.
  Everything else keeps today's asm/single/multi routing. If native construction
  throws, fall back to the asm Worker (never leave iOS with no engine).

## Phases

- [x] **P0 — stopgap** (asm liveness guard) — SHIPPED PR #782.
- [ ] **P1 — plugin package + vendored engine**: scaffold dir, copy SF 14.1 src,
      write pure-C `StockfishEngineCore.mm`, `Package.swift`, Swift plugin, TS API.
      Compiles in CI, not sandbox.
- [ ] **P2 — transport seam + tests** in `stockfishEngine.ts`; unit-test the
      adapter + native-selection gating (runnable in-sandbox).
- [ ] **P3 — wire build**: root `package.json` file: dep; confirm `cap sync`
      SPM-autolinks it; adjust `ci_post_clone.sh` only if the SPM package list
      needs the plugin.
- [ ] **P4 — CI compile loop**: trigger Xcode Cloud (`daily-deploy.yml`), read
      build logs, fix SPM include-paths / C++ flags / interop until green.
      (Only real verification of the native half — no sandbox path.)
- [ ] **P5 — TestFlight verify**: install, open `/coach/teach`, confirm PostHog
      shows `stockfish_variant = ios-native` and `stockfish-error` rate ~0.

## Risks / open items

- **First CI builds WILL fail** (SPM path/flag issues) — expected; that's P4.
  Each build burns a TestFlight/Xcode-Cloud build (David opted into this).
- **`-fno-exceptions` + `std::thread`/`std::getline`** — SF builds this way
  normally; keep it. Drop `-flto=thin` for the first build to reduce variables.
- **arm64 SIMD** — NNUE off, so nnue/*.cpp compile but aren't exercised; scalar
  fallbacks should compile. CI will confirm.
- **App-background** — keep the native `stop` on `willResignActive`; the JS
  engine already resets on `visibilitychange`.
- **GPLv3** — SF is GPLv3; the app already ships GPL'd asm.js SF, so no new
  obligation. Keep the license headers + `stockfish/Copying.txt`.

## Next-session pickup

Resume at the first unchecked phase. If a CI build failed, read its log
(`daily-deploy` run → Xcode Cloud) and fix the named SPM/flag error. The plugin
is self-contained under `native-plugins/capacitor-stockfish-native/`; the seam is
`stockfishEngine.ts` `tryStart` + `resolveWorkerUrl`.
