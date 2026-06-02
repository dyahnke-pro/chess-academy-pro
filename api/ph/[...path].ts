/**
 * /api/ph/* — first-party reverse proxy for PostHog (David 2026-06-02).
 *
 * Why this exists: Safari's "Prevent Cross-Site Tracking" + ad-blockers block
 * direct requests to us.i.posthog.com, so a large share of real users (the
 * iOS/Safari launch audience) silently send zero analytics + crash data.
 * Routing ingestion through our OWN domain makes it same-origin → first-party
 * → never blocked. The client sets posthog `api_host` to this path.
 *
 * Why a FUNCTION and not a vercel.json rewrite: Vercel's static rewrites to an
 * external URL proxy GET fine but return 405 for POST — and event capture is a
 * POST. An Edge function forwards every method and streams the body through
 * faithfully (posthog's capture bodies are compressed/form-encoded).
 *
 * Routing: `/api/ph/static/*` → us-assets (the SDK's recorder/surveys assets),
 * everything else → us.i.posthog.com (capture, flags, batch, …).
 */
export const config = { runtime: 'edge' };

const EVENTS_HOST = 'https://us.i.posthog.com';
const ASSETS_HOST = 'https://us-assets.i.posthog.com';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const phPath = url.pathname.replace(/^\/api\/ph\/?/, '');
  const base = phPath.startsWith('static/') ? ASSETS_HOST : EVENTS_HOST;
  const target = `${base}/${phPath}${url.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
    redirect: 'manual',
  };
  if (hasBody) {
    init.body = req.body;
    init.duplex = 'half';
  }

  const upstream = await fetch(target, init);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: new Headers(upstream.headers),
  });
}
