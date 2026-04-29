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
import StockfishWeb from '/stockfish/sf16-7.js';

let engine = null;
let pendingCommands = [];

(async () => {
  try {
    engine = await StockfishWeb({
      // Pass through onError as a top-level option since the module
      // doesn't fully wire it via the .onError= setter until after
      // construction. Same for listen — set both via post-construct
      // assignment below to be safe.
    });
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
  } catch (err) {
    self.postMessage(`error: bridge-init failed: ${err && err.message ? err.message : String(err)}`);
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
