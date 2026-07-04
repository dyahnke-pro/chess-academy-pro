// Universal prod interception for sandbox Chromium audits.
//
// Stronger than prod-bridge.mjs: instead of a localhost origin, Chromium
// navigates to the REAL prod URL and we intercept EVERY request via
// page.route — the main document, /assets/*, same-origin /api/*, AND external
// absolute hosts (the client-direct LLM at api.deepseek.com). Each is fetched
// by node/undici through the agent proxy (which handles HTTPS fine) and
// fulfilled, so Chromium never does the TLS handshake its egress proxy resets.
// The page runs at its true prod origin (real storage keys, no CSP/origin
// weirdness) with a fully working coach brain.
import { ProxyAgent, request } from 'undici';

const PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:39957';

export async function attachProxyInterception(target) {
  const agent = new ProxyAgent(PROXY);
  await target.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    if (!/^https?:/i.test(url)) { await route.continue(); return; }
    try {
      const headers = { ...req.headers() };
      delete headers['accept-encoding'];
      const postData = req.postDataBuffer();
      const r = await request(url, {
        method: req.method(), headers, body: postData ?? undefined,
        dispatcher: agent, maxRedirections: 0, headersTimeout: 45000, bodyTimeout: 45000,
      });
      const respHeaders = {};
      for (const [k, v] of Object.entries(r.headers)) {
        const lk = k.toLowerCase();
        if (['content-security-policy', 'content-security-policy-report-only', 'strict-transport-security', 'content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lk)) continue;
        respHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v);
      }
      const body = Buffer.from(await r.body.arrayBuffer());
      await route.fulfill({ status: r.statusCode, headers: respHeaders, body });
    } catch (e) {
      await route.fulfill({ status: 502, contentType: 'text/plain', body: `intercept error: ${e.message}` });
    }
  });
}
