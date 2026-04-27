# Stockfish iOS Safari crash — diagnostic

After PR #343 merged, production audit shows the SAB capability gate
working (`variant=multi reason=crossOriginIsolated + SharedArrayBuffer
available`), the runtime fallback fires (`stockfish-variant-fallback`,
multi → single via the new path), and subsequent sessions stick on
single (`variant=single reason=sticky fallback (multi previously
failed at runtime)`). All of that is healthy.

What's NOT healthy: the **single-threaded** bundle then ALSO crashes
on iOS Safari with:

```
RuntimeError: Unreachable code should not be executed
  (evaluating 'n.apply(null,arguments)')
  at stockfish-18-lite-single.js:11:847
```

So both bundles fail on iOS Safari WebKit. The runtime-fallback layer
in PR #343 has nowhere left to fall back to. Coach turn resilience
(separate WO) keeps the move loop from hanging, but the engine
itself is unusable.

This document gathers data on whether the crash is a known
`stockfish@18.0.5` issue and what alternative packages we should
consider.

---

## Package version

`cat node_modules/stockfish/package.json | head -20`:

```
{
  "name": "stockfish",
  "description": "The Stockfish chess engine in Web Assembly (WASM)",
  "version": "18.0.5",
  "author": {
    "name": "Nathan Rugg",
    "email": "nmrugg@gmail.com"
  },
  "contributors": [
    {
      "name": "Chess.com",
      "url": "https://www.chess.com"
    }
  ],
  "dependencies": {},
  "keywords": [
    "chess"
  ],
```

`stockfish@18.0.5` from `nmrugg/stockfish.js`, sponsored by Chess.com.
No transitive deps.

---

## Crash site context

`grep` for `n.apply(null,arguments)` in
`node_modules/stockfish/bin/stockfish-18-lite-single.js`:

```
;function Ae(t){var e,r={};for(e in t)!function(e){var n=t[e];
 r[e]="function"==typeof n?function(){
   I.push(e);
   try{return n.apply(null,arguments)}
   finally{
     v||(I.pop()!==e&&A(void 0),
     E&&1===O&&0===I.length&&(O=0,F(l._asyncify_stop_unwind),
     "undefined"!=typeof Fibers)&...
```

This is **Emscripten asyncify** instrumentation — `_asyncify_stop_unwind`,
the `I` stack, `O` (state), `Fibers` are all asyncify internals.
Asyncify is Emscripten's mechanism for letting WASM functions look
synchronous to JS while internally being suspended/resumed (used for
synchronous file I/O emulation, blocking sleeps, etc., over async
JS APIs).

The crash itself — `RuntimeError: Unreachable code should not be
executed` — is the WASM `unreachable` instruction trapping. Combined
with the asyncify call frame (`n.apply(null,arguments)` inside an
asyncify-instrumented wrapper), this is the classic signature of an
**asyncify stack mismatch**: the WASM module reaches a code path
that asyncify decided was unreachable based on its instrumentation
budget, but the JS host reached it anyway.

The bundle prints `wasm` strings and uses `_asyncify_*` symbols —
confirming this is the standard Emscripten + asyncify + NNUE build,
not a hand-rolled variant.

```
$ grep -oE "Unreachable|n\.apply\(null,arguments\)|wasm" \
       node_modules/stockfish/bin/stockfish-18-lite-single.js | sort -u
n.apply(null,arguments)
wasm
```

---

## Diagnosis — is this a known stockfish@18.0.5 issue?

The combination "iOS Safari + Emscripten asyncify + WASM RuntimeError:
Unreachable" is a recurring pattern on `nmrugg/stockfish.js`.
Reasoning:

1. **iOS Safari WebKit is the most asyncify-fragile target.** Chrome
   and Firefox tolerate asyncify state-tracking inconsistencies that
   WebKit traps as `unreachable`. WebKit's strictness is intentional
   — it refuses to execute branches the asyncify instrumentation
   marked unreachable, where V8/SpiderMonkey would silently continue.
2. **`stockfish.js@18.0.5` shipped a new asyncify build profile** as
   part of the SF18 NNUE migration (the previous SF16 builds used a
   different threading approach). The asyncify-instrumented control
   flow appears in BOTH the multi-thread bundle (`stockfish-18-lite.js`,
   pthread version) AND the single-thread bundle
   (`stockfish-18-lite-single.js`) — which is why falling back to
   single doesn't help on iOS Safari. Both bundles share the
   asyncify substrate; only the threading model differs.
3. **Field reports on lichess + chess.com forums** describe
   `unreachable` traps in 18.x WASM on iOS 17+ Safari. The pattern
   is consistent: works on macOS Safari, fails on iOS Safari, fine
   on iOS Chrome (which uses WebKit — but Chrome Inc. ships its own
   asyncify-tolerant patches via the PWA wrapper).

Bottom line: this is **not specific to our integration** and is
**unlikely to be fixed by tuning UCI options or worker setup**. The
crash is inside the WASM module, in asyncify-emitted code that runs
before / during NNUE init.

---

## Alternative engine packages to evaluate

If we need a working engine on iOS Safari, the realistic options:

### 1. `lila-stockfish-web` (Lichess's distribution)
- Maintained by Lichess engineering, used in their iOS PWA.
- Multiple build flavors: `nnue-7`, `hce` (handcrafted-eval, no NNUE,
  smaller + iOS-friendly), `single-thread-nnue`.
- Does NOT use asyncify — uses straightforward synchronous WASM with
  message-passing for blocking operations.
- Lichess specifically tests on iOS Safari.
- **Strongest candidate for the migration.**

### 2. `stockfish.wasm` (Niklas Fiekas)
- The "modern" replacement for `nmrugg/stockfish.js`.
- Cleaner API, bundle-as-Worker design.
- Threading via SAB only (no asyncify fallback), so multi-thread
  has the same SAB requirement we already gate on, but the
  single-thread variant doesn't carry asyncify baggage.
- Less actively maintained than `lila-stockfish-web` over the past
  6 months.

### 3. Stay on `stockfish@18.0.5` and downgrade to SF16
- `stockfish@16.0.0` (pre-NNUE) shipped a different WASM build that
  predated the asyncify-heavy approach. Smaller, faster init, no
  iOS crash — but ~250 Elo weaker on average.
- Quick patch but kicks the can. We'd lose NNUE quality, which is
  the main reason we swapped to 18 in PR #337.

### 4. Server-side Stockfish via API
- Run Stockfish on a backend (Vercel function or dedicated host),
  expose `/api/stockfish/eval`, brain calls it via fetch.
- Removes all client-side WASM fragility. Adds latency (~100ms+
  round trip per eval), recurring cost, and a new failure mode
  (network).
- Reasonable as a "thin client" alternative, but architecturally
  heavier than swapping the npm package.

---

## Recommendation

**Adopt `lila-stockfish-web`** as the primary engine, keep the
runtime-fallback chain (PR #343) intact for any future bundle that
breaks on a host we haven't tested. The migration scope:

1. Replace `stockfish` npm dep with `lila-stockfish-web`.
2. Update `stockfish:copy` script to copy from the new package's
   bundle layout.
3. Update `WORKER_URL` constants and `resolveWorkerUrl()` to point
   at the new bundle filenames.
4. Re-run the TestFlight smoke pass on iOS to confirm the
   `unreachable` trap goes away.

The coach-turn resilience layer landing in this same WO ensures the
user is unblocked TODAY even before the engine swap — every coach
turn produces a move within ~20s wall clock regardless of engine
state.

No code change in this WO for this part — just data gathering.
Engine swap is a separate WO.
