/**
 * /api/ph/* — first-party reverse proxy for PostHog (David 2026-06-02).
 *
 * Why: Safari "Prevent Cross-Site Tracking" + ad-blockers block direct
 * requests to us.i.posthog.com, so a large share of real users (the
 * iOS/Safari launch audience) silently send zero analytics + crash data.
 * Same-origin /api/ph dodges that. The client sets posthog `api_host` here.
 *
 * Why a node function (not a vercel.json rewrite, not Edge): external static
 * rewrites 405 every POST (event capture is a POST), and the Edge runtime
 * wasn't registered in this Vite project (404). A plain @vercel/node function
 * — same pattern as every other api/* here — forwards all methods. posthog-js
 * sends capture bodies as `text/plain` (to avoid a CORS preflight), so
 * @vercel/node hands us the raw string body to pass straight through.
 *
 * Routing: `/api/ph/static/*` → us-assets (SDK assets), else → us.i.posthog.com.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const EVENTS_HOST = 'https://us.i.posthog.com';
const ASSETS_HOST = 'https://us-assets.i.posthog.com';

const DROP_REQ_HEADERS = new Set(['host', 'connection', 'content-length', 'accept-encoding']);
const DROP_RES_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection']);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const u = new URL(req.url ?? '', 'http://localhost');
    const phPath = u.pathname.replace(/^\/api\/ph\/?/, '');
    const base = phPath.startsWith('static/') ? ASSETS_HOST : EVENTS_HOST;
    const target = `${base}/${phPath}${u.search}`;

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string' && !DROP_REQ_HEADERS.has(k.toLowerCase())) headers[k] = v;
    }

    const method = req.method ?? 'GET';
    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD' && req.body != null) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const upstream = await fetch(target, { method, headers, body });
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);
    upstream.headers.forEach((val, key) => {
      if (!DROP_RES_HEADERS.has(key.toLowerCase())) res.setHeader(key, val);
    });
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: 'posthog proxy failed', detail: String(e) });
  }
}
