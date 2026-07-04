// Prod bridge — lets sandbox Chromium audit the LIVE prod app.
//
// Why: this container's egress proxy re-terminates TLS in a way that RESETS
// Chromium's HTTPS handshake (curl/node are fine; plain HTTP is fine). So a
// direct Playwright→prod navigation always fails with ERR_CONNECTION_RESET.
// The bridge is a plain-HTTP localhost server that forwards EVERY request
// (page, /assets/*, /api/*) to https://chess-academy-pro.vercel.app through the
// agent proxy (which node handles), and streams the real prod response back.
// Chromium points at the bridge over HTTP (no TLS to trip on) and runs the
// REAL prod bundle + real API responses — a genuine prod audit, not localhost.
import http from 'node:http';
import { ProxyAgent, request } from 'undici';

const PROD = process.env.AUDIT_PROD_ORIGIN || 'https://chess-academy-pro.vercel.app';
const PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:39957';

// Response headers to drop: security headers that break same-origin-over-HTTP,
// and length/encoding headers that would mismatch our re-stream.
const STRIP = new Set([
  'content-security-policy', 'content-security-policy-report-only',
  'strict-transport-security', 'x-frame-options',
  'content-length', 'transfer-encoding', 'connection', 'content-encoding',
]);

export async function startProdBridge(port = 8099) {
  const agent = new ProxyAgent(PROXY);
  const server = http.createServer((req, res) => {
    (async () => {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const headers = { ...req.headers };
      delete headers.host;
      delete headers['accept-encoding']; // force identity so no encoding mismatch
      const r = await request(PROD + req.url, {
        method: req.method, headers, body, dispatcher: agent,
        maxRedirections: 0, headersTimeout: 30000, bodyTimeout: 30000,
      });
      const out = {};
      for (const [k, v] of Object.entries(r.headers)) if (!STRIP.has(k.toLowerCase())) out[k] = v;
      res.writeHead(r.statusCode, out);
      for await (const c of r.body) res.write(c);
      res.end();
    })().catch((e) => { try { res.writeHead(502); res.end(`bridge error: ${e.message}`); } catch { /* */ } });
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${port}`, prod: PROD, close: () => new Promise((r) => server.close(r)) };
}
