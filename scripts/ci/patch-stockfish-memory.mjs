// Patch the vendored multi-thread Stockfish glue to cap its WASM memory
// reservation. Runs in `stockfish:copy` (postinstall) AFTER the pristine file
// is copied out of node_modules, so it re-applies on every install/build and
// survives a `stockfish` package bump.
//
// WHY: `stockfish-18-lite.js` creates its pthread SharedArrayBuffer as
//   new WebAssembly.Memory({ initial: …, maximum: 32768, shared: true })
// 32768 pages × 64KB = 2 GB. A *shared* WASM memory reserves its entire
// `maximum` as contiguous virtual ADDRESS SPACE the instant it's instantiated
// (a growable shared buffer can't be moved later). On desktop the multi-thread
// singleton therefore grabs a 2GB reservation; co-resident with the analysis
// pool + JS heap the browser can't find a 2GB contiguous block and throws
// "Cannot allocate Wasm memory for new instance" — an OOM crash-loop that kills
// the tab with no telemetry (it dies before anything flushes). David hit this
// on his Mac (2026-09-08).
//
// The `.wasm` declares its memory import as min=2048 (128MB), max=32768 (2GB),
// shared. WASM import matching lets us supply a memory whose `maximum` is ≤ the
// declared max and ≥ the initial — so lowering the JS `maximum` to 8192 pages
// (512MB) is spec-legal WITHOUT rebuilding the wasm. Stockfish at 64MB hash +
// ≤4 thread stacks fits in 512MB with generous headroom; the reservation drops
// 4× (2GB → 512MB), clearing the OOM while keeping the engine multi-threaded.
//
// Fails loudly if the expected token is absent (a vendor bump changed the glue)
// so this never silently no-ops and lets the 2GB reservation back in.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const FILE = 'public/stockfish/stockfish-18-lite.js';
const FROM = 'maximum:32768,shared:!0';
const TO =
  'maximum:8192/*CAP 512MB (was 32768=2GB): shared memory reserves its max as ' +
  'contiguous address space up front; the 2GB reservation OOM-crashed desktop ' +
  'when co-resident with the analysis pool. See scripts/ci/patch-stockfish-memory.mjs*/,shared:!0';
const ALREADY = 'maximum:8192/*CAP 512MB';

if (!existsSync(FILE)) {
  // stockfish:copy failed or ran in an env without the package — not this
  // script's job to police; exit clean so postinstall isn't wedged.
  console.warn(`[patch-stockfish-memory] ${FILE} not found — skipping (copy step may have been skipped).`);
  process.exit(0);
}

const src = readFileSync(FILE, 'utf8');

if (src.includes(ALREADY)) {
  console.log('[patch-stockfish-memory] already patched (512MB cap present) — no-op.');
  process.exit(0);
}

if (!src.includes(FROM)) {
  console.error(
    `[patch-stockfish-memory] EXPECTED TOKEN NOT FOUND in ${FILE}: "${FROM}".\n` +
    `The vendored stockfish glue changed (package bump?). Re-derive the shared\n` +
    `WebAssembly.Memory maximum cap before shipping — do NOT ship the 2GB default.`,
  );
  process.exit(1);
}

const out = src.replace(FROM, TO);
writeFileSync(FILE, out, 'utf8');
console.log('[patch-stockfish-memory] capped multi-thread WASM memory reservation 2GB → 512MB.');
