/**
 * lila-bridge.worker.js — adapts lila-stockfish-web's
 * `engine.uci()` / `engine.listen` / `engine.onError` API to the
 * classic Stockfish.js worker contract that stockfishEngine.ts
 * already speaks (`postMessage(string)` to send UCI commands,
 * `onmessage = (event) => ...` to receive output lines).
 *
 * Why this bridge: stockfishEngine.ts has years of careful queue +
 * crash-retry + brain-priority logic built around the classic
 * worker shape. lila-stockfish-web is an ES module, not a
 * worker-script. This bridge runs INSIDE a module worker, imports
 * the module, and adapts the two contracts so the engine code
 * upstream doesn't need to know which Stockfish bundle is running.
 *
 * Targets:
 *   sf16-7 — single-threaded Stockfish 16, ~430KB WASM, no SAB
 *            required. Known-working on iOS Safari (Lichess uses
 *            this on devices that lack SharedArrayBuffer).
 *
 * NNUE: sf16-7 ships with a classical-eval fallback that runs
 * without NNUE. Quality is lower than NNUE-backed search but
 * sufficient for the move-selector / hint depths we use. NNUE
 * download + IndexedDB cache is a future optimization (see
 * WO-STOCKFISH-NNUE-FETCH).
 */

// Import the lila module. This is a module-worker; the URL is
// resolved relative to this script's location.
//
// ROOT-CAUSE FIX (David 2026-06-15): this import was STATIC and top-level.
// On iOS the engine crashed via the host's worker.onerror with an EMPTY
// reason — because a static top-level `import` that fails (module load /
// sf16-7 eval / wasm fetch) dies BEFORE the try/catch below runs, so the
// failure surfaced as an uncaught worker error with no message instead of a
// reportable `error: bridge-init failed: <reason>`. Moving it to a DYNAMIC
// import INSIDE the try/catch means an import failure is caught and posted
// with its real reason + stack — which both makes the failure graceful and
// finally tells us WHY sf16-7 won't load on the device.

let engine = null;
let pendingCommands = [];

// Stage markers (David 2026-06-15): the iOS init HANGS (45s timeout, not an
// error), so we can't see WHERE. Post a marker before/after each init step;
// the host records the last one and folds it into the timeout message, so the
// next session names the exact hang point (import vs wasm-instantiate vs
// emscripten-runtime). Prefix is chosen to NOT match the host's info/bestmove/
// error parsing.
const stage = (s) => {
  try { self.postMessage(`__sfstage__ ${s}`); } catch { /* ignore */ }
};

(async () => {
  try {
    stage('import-start');
    const mod = await import('/stockfish/sf16-7.js');
    stage('import-done');
    const StockfishWeb = mod.default;
    if (typeof StockfishWeb !== 'function') {
      throw new Error(`sf16-7 default export is ${typeof StockfishWeb}, expected function`);
    }
    stage('instantiate-start');
    engine = await StockfishWeb({
      // Pass through onError as a top-level option since the module
      // doesn't fully wire it via the .onError= setter until after
      // construction. Same for listen — set both via post-construct
      // assignment below to be safe.
    });
    stage('instantiate-done');
    engine.listen = (line) => {
      // Forward every UCI line back to the main thread. Existing
      // stockfishEngine.ts.handleMessage() parses these.
      try {
        self.postMessage(line);
      } catch (err) {
        self.postMessage(`error: bridge-postMessage failed: ${err && err.message ? err.message : String(err)}`);
      }
    };
    engine.onError = (msg) => {
      self.postMessage(`error: ${msg}`);
    };
    // Drain any commands that arrived during async init.
    for (const cmd of pendingCommands) {
      try {
        engine.uci(cmd);
      } catch (err) {
        self.postMessage(`error: bridge-uci-pre-init failed: ${err && err.message ? err.message : String(err)}`);
      }
    }
    pendingCommands = [];
    stage('ready');
  } catch (err) {
    // Surface the FULL reason (name + message + stack head) so the host's
    // surfaceWorkerError logs WHY sf16-7 failed to load/init on the device —
    // "Failed to fetch dynamically imported module", a wasm error, a parse
    // error, etc. This is the signal that was empty before the dynamic-import
    // change (David 2026-06-15 root-cause hunt).
    const name = err && err.name ? err.name : 'Error';
    const detail = err && err.message ? err.message : String(err);
    const stack = err && err.stack ? ` | ${String(err.stack).slice(0, 240)}` : '';
    self.postMessage(`error: bridge-init failed: ${name}: ${detail}${stack}`);
  }
})();

self.onmessage = (event) => {
  const cmd = event.data;
  // Only string UCI commands are accepted; ignore anything else
  // (the classic Stockfish.js worker contract is string-in,
  // string-out).
  if (typeof cmd !== 'string') return;
  if (!engine) {
    pendingCommands.push(cmd);
    return;
  }
  try {
    engine.uci(cmd);
  } catch (err) {
    self.postMessage(`error: bridge-uci failed: ${err && err.message ? err.message : String(err)}`);
  }
};
