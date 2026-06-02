/**
 * /api/phproxy — first-party reverse proxy for PostHog (David 2026-06-02).
 *
 * Why: Safari "Prevent Cross-Site Tracking" + ad-blockers block direct
 * requests to us.i.posthog.com, so a large share of real users (the
 * iOS/Safari launch audience) silently send zero analytics + crash data.
 * A same-origin proxy dodges that. The client sets posthog `api_host` to
 * `/api/ph`, and vercel.json rewrites `/api/ph/:path*` → here with the path
 * in `?p=`. (A nested catch-all `api/ph/[...path].ts` 404'd — Vercel doesn't
 * register catch-all subdir functions in this Vite project; external static
 * rewrites 405 every POST. A FLAT function + a query-param rewrite is the
 * combination that actually routes AND accepts POST.)
 *
 * Routing: `static/*` → us-assets (SDK assets), else → us.i.posthog.com.
 * posthog-js posts capture as text/plain (to avoid a CORS preflight), so
 * @vercel/node hands us the raw string body to forward unchanged.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const EVENTS_HOST = 'https://us.i.posthog.com';
const ASSETS_HOST = 'https://us-assets.i.posthog.com';

const DROP_REQ_HEADERS = new Set(['host', 'connection', 'content-length', 'accept-encoding']);
const DROP_RES_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection']);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const u = new URL(req.url ?? '', 'http://localhost');
    const phPath = (u.searchParams.get('p') ?? '').replace(/^\/+/, '');
    u.searchParams.delete('p');
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
