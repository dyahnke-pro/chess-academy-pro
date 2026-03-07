# Stockfish WASM Files

Place the Stockfish WASM engine files here. These are downloaded via npm (`stockfish` package v18.0.5) and must be copied to this directory to be served as static assets.

## Required Files

After running `npm install`, copy from `node_modules/stockfish/`:

```
stockfish-nnue-16-single.js
stockfish-nnue-16-single.wasm
stockfish-nnue-16-multi.js
stockfish-nnue-16-multi.wasm
```

## Copy command (run from project root)

```bash
cp node_modules/stockfish/src/stockfish-nnue-16*.{js,wasm} public/stockfish/
```

## Why here?

The engine runs in a Web Worker. Web Workers can only load scripts from the same origin as static files — they cannot be bundled by Vite. They must be served directly from the `/public` directory.

## Platform selection

`stockfishEngine.ts` automatically selects:
- Mobile/no SharedArrayBuffer → `stockfish-nnue-16-single.js` (7MB, single-threaded)
- Desktop with COOP/COEP headers → `stockfish-nnue-16-multi.js` (multi-threaded)

COOP/COEP headers are set in `vite.config.ts` for development and must be set on your server/CDN for production.
