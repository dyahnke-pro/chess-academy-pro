# Stockfish engine files

Copied from `node_modules` by `npm run stockfish:copy` (postinstall) and
gitignored — do not commit them.

| file | build | who loads it |
|---|---|---|
| `stockfish-18-lite.js` + `.wasm` | Stockfish 18 lite, multi-thread WASM | desktop / Android web with crossOriginIsolated + SharedArrayBuffer |
| `stockfish-18-lite-single.js` + `.wasm` | Stockfish 18 lite, single-thread WASM | web without SAB, and the batch-analysis pool off iOS |
| `stockfish-asm.js` | pure asm.js, no WASM | every iOS path: iOS Safari, and the iOS app's fallback when the native engine (`native-plugins/capacitor-stockfish-native`) is unavailable, plus the iOS analysis pool |

Routing lives in `src/services/stockfishEngine.ts` (`resolveWorkerUrl`).

The iOS app and the iOS OTA bundle ship ONLY `stockfish-asm.js` — the WASM
builds are stripped after `vite build` by `scripts/ci/strip-native-bundle.mjs`
(iOS never loads them). The web deploy keeps every file.
