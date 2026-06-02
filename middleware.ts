/**
 * Edge Middleware — first-party PostHog reverse proxy (David 2026-06-02).
 *
 * Safari "Prevent Cross-Site Tracking" + ad-blockers block direct requests to
 * us.i.posthog.com, so iOS/Safari users silently send zero analytics + crash
 * data. Same-origin /api/ph fixes that. We do the proxy in MIDDLEWARE because
 * Vercel's vercel.json `rewrites` proxy GET but 404/405 POST + extensionless
 * paths (i/v0/e/, e/, flags/) — every method posthog needs. Middleware lets us
 * fetch the upstream ourselves, so all methods + trailing slashes just work.
 *
 * Routing: /api/ph/static/* → us-assets (SDK assets), else → us.i.posthog.com.
 */
export const config = { matcher: '/api/ph/:path*' };

const EVENTS_HOST = 'https://us.i.posthog.com';
const ASSETS_HOST = 'https://us-assets.i.posthog.com';

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const phPath = url.pathname.replace(/^\/api\/ph\//, '');
  const base = phPath.startsWith('static/') ? ASSETS_HOST : EVENTS_HOST;
  const target = `${base}/${phPath}${url.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
    redirect: 'manual',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    init.duplex = 'half';
  }

  const upstream = await fetch(target, init);
  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete('content-encoding');
  resHeaders.delete('content-length');
  return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
}
