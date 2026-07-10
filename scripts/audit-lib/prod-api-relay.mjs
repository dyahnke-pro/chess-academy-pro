/**
 * prod-api-relay — a local origin that serves the app from the vite dev server
 * but relays every `/api/*` call to PRODUCTION (which holds the working LLM +
 * Polly keys server-side). This exists because THIS container's browser cannot
 * reach prod directly (ERR_CONNECTION_RESET) and the LLM keys in the container
 * env are expired — but NODE can reach prod's same-origin proxies. So:
 *
 *   browser → http://localhost:<PORT>/api/llm/deepseek/... (same origin, no CORS)
 *           → node relay → https://chess-academy-pro.vercel.app/api/llm/deepseek/...
 *           → prod's working key → DeepSeek → streamed back to the browser
 *
 * Everything that is NOT `/api/*` proxies to the vite dev server (current HEAD),
 * so the audited bundle is exactly the code under test.
 *
 * Usage:
 *   import { startProdApiRelay } from './audit-lib/prod-api-relay.mjs';
 *   const relay = await startProdApiRelay({ vite: 'http://localhost:5173' });
 *   // drive Playwright at relay.url; relay.stop() when done.
 */
import http from 'node:http';
import { Readable } from 'node:stream';

const PROD = 'https://chess-academy-pro.vercel.app';

/**
 * @param {{ vite?: string, port?: number, prod?: string }} opts
 * @returns {Promise<{ url: string, port: number, stop: () => void, stats: () => object }>}
 */
export async function startProdApiRelay(opts = {}) {
  const vite = opts.vite ?? 'http://localhost:5173';
  const prod = opts.prod ?? PROD;
  const prodOrigin = new URL(prod).origin;
  let apiCalls = 0, apiErrors = 0, api429 = 0;

  const server = http.createServer(async (req, res) => {
    const isApi = req.url.startsWith('/api/');
    const target = (isApi ? prod : vite) + req.url;

    // Collect the request body (POST bodies for LLM/TTS).
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    // Forward headers; for API calls, rewrite Origin to the prod origin so
    // prod's `originAllowed()` gate passes (the browser's localhost origin would
    // 403). Drop hop-by-hop + host.
    const fwd = {};
    for (const [k, v] of Object.entries(req.headers)) {
      const lk = k.toLowerCase();
      if (['host', 'connection', 'content-length', 'origin', 'referer'].includes(lk)) continue;
      fwd[k] = v;
    }
    if (isApi) { fwd['origin'] = prodOrigin; fwd['referer'] = prod + '/'; }

    try {
      const upstream = await fetch(target, {
        method: req.method,
        headers: fwd,
        body,
        redirect: 'manual',
      });
      if (isApi) {
        apiCalls++;
        if (upstream.status === 429) api429++;
        if (upstream.status >= 500) apiErrors++;
      }
      // Mirror status + headers (strip encoding/length so the browser doesn't
      // try to re-decode an already-decoded stream).
      const outHeaders = {};
      upstream.headers.forEach((v, k) => {
        const lk = k.toLowerCase();
        if (['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lk)) return;
        outHeaders[k] = v;
      });
      res.writeHead(upstream.status, outHeaders);
      if (upstream.body) {
        // Stream the response through (LLM + TTS are chunked).
        Readable.fromWeb(upstream.body).pipe(res);
      } else {
        res.end();
      }
    } catch (e) {
      if (isApi) apiErrors++;
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'relay upstream failed', target, detail: String(e) }));
    }
  });

  const port = await new Promise((resolve) => {
    server.listen(opts.port ?? 0, '127.0.0.1', () => resolve(server.address().port));
  });

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    stop: () => server.close(),
    stats: () => ({ apiCalls, apiErrors, api429 }),
  };
}
