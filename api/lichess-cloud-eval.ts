/**
 * /api/lichess-cloud-eval — server-side proxy for Lichess's cloud
 * eval endpoint. Same rationale as `/api/lichess-explorer`: iOS
 * Safari's default User-Agent is gateway-blocked at Lichess; a
 * Vercel Edge function can set a real `User-Agent` that the gateway
 * accepts, so the client-side fetch routes through us instead.
 *
 *   GET /api/lichess-cloud-eval?fen=<fen>&multiPv=<n>
 *
 * Returns the upstream JSON verbatim. 404 from upstream (position
 * not in the cloud) is passed through so the client's
 * `if (status === 404) return null` path keeps working unchanged.
 */
export const config = { runtime: 'edge' };

const UPSTREAM = 'https://lichess.org/api/cloud-eval';
const UPSTREAM_USER_AGENT =
  'ChessAcademyPro/1.0 (https://chess-academy-pro.vercel.app; contact: dyahnke@gmail.com)';
const PROXY_TIMEOUT_MS = 8_000;

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (
    origin === 'capacitor://app.chessacademy.pro' ||
    origin === 'https://app.chessacademy.pro' ||
    origin === 'https://chess-academy-pro.vercel.app' ||
    /^https:\/\/chess-academy-pro-[a-z0-9-]+-dyahnke-pros-projects\.vercel\.app$/.test(origin) ||
    origin === ''
  ) {
    base['Access-Control-Allow-Origin'] = origin || '*';
  }
  // Vary on Origin ALWAYS so the CDN keys the cache per-origin — a no-origin /
  // disallowed request must not poison the shared cache with an ACAO-less body
  // (the bug that CORS-blocked the Android WebView; see api/tts.ts).
  base['Vary'] = 'Origin';
  return base;
}

export default async function handler(req: Request): Promise<Response> {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: cors });
  }

  const url = new URL(req.url);
  const fen = url.searchParams.get('fen');
  if (!fen) {
    return new Response(JSON.stringify({ error: 'fen is required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const upstreamParams = new URLSearchParams();
  for (const [k, v] of url.searchParams) upstreamParams.set(k, v);
  const upstreamUrl = `${UPSTREAM}?${upstreamParams.toString()}`;

  // Optional LICHESS_API_KEY — see lichess-explorer.ts. Also accepts
  // the legacy LICHESS_TOKEN name.
  const token = process.env.LICHESS_API_KEY ?? process.env.LICHESS_TOKEN;
  const upstreamHeaders: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': UPSTREAM_USER_AGENT,
  };
  if (token) upstreamHeaders.Authorization = `Bearer ${token}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const body = await upstream.text();
    // Status-aware caching. The old flat `max-age=60` had two problems that
    // produced the 429 cascade seen in prod (David's /coach/play session,
    // 2026-06-28): (1) 60s is far too short — a cloud eval for a FEN is
    // deterministic and effectively permanent, yet ultra-common opening
    // positions (Italian, Two Knights, …) expired every minute and re-hit
    // Lichess, and the coach prefetches 4 new FENs per move, so bursts blew
    // through Lichess's per-IP rate limit; (2) it cached ERROR responses too,
    // so a single upstream 429 got served from the CDN for 60s. Fix: cache
    // successful evals hard (they don't change), cache "not in cloud" briefly,
    // and NEVER cache errors — let the client's own 30s cooldown back off.
    let cacheControl: string;
    if (upstream.status === 200) {
      // Deterministic + stable → cache a day at the edge, serve stale for a
      // week while revalidating so repeat/cross-user positions never re-hit.
      cacheControl = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';
    } else if (upstream.status === 404) {
      // "Not in the cloud" — true for now; re-ask in an hour, not every move.
      cacheControl = 'public, max-age=3600, s-maxage=3600';
    } else {
      // 429 / 5xx — do NOT cache; one rate-limit must not become 60s of them.
      cacheControl = 'no-store';
    }
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'upstream-fetch-failed',
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
}
