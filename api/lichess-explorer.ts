/**
 * /api/lichess-explorer — server-side proxy for the Lichess opening
 * explorer. Production audit cycle 6 confirmed (via the 3-shape probe
 * tool) that Lichess returns HTTP 401 to bare GETs from iOS Safari's
 * default User-Agent — so every client-side header trick we tried
 * (`User-Agent` set in fetch, `X-Client`, no headers) was chasing the
 * wrong root cause. The real fix: route through a Vercel Edge
 * function where User-Agent ISN'T on the forbidden-header list and
 * Lichess is happy to talk to us.
 *
 * Same shape as the upstream endpoint:
 *   GET /api/lichess-explorer?source=masters&fen=<fen>&...
 *
 * Forwards every query parameter except `source` (which selects the
 * upstream path: `masters` | `lichess`). Returns the upstream JSON
 * verbatim so the client-side parser doesn't change.
 */
export const config = { runtime: 'edge' };

const EXPLORER_BASE = 'https://explorer.lichess.ovh';
const ALLOWED_SOURCES = new Set(['masters', 'lichess']);

/** Full identifier used as User-Agent in the server→Lichess hop.
 *  Lichess's bot policy expects contact info (email or maintainer URL)
 *  in the User-Agent. Production audit (build 30fe8c8) showed Lichess
 *  returning 401 with an nginx body for our previous URL-only UA, even
 *  though our proxy code is otherwise correct. The bare URL identifier
 *  passed earlier got tightened up on their end; including a contact
 *  email here is the documented way to stay on the allow path. */
const UPSTREAM_USER_AGENT =
  'ChessAcademyPro/1.0 (https://chess-academy-pro.vercel.app; contact: dyahnke@gmail.com)';

const PROXY_TIMEOUT_MS = 8_000;

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const base: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  // Permissive for this read-only public proxy: accept any
  // Chess Academy Pro deployment (production + preview) and the
  // installed PWA Capacitor origin. Preview URLs include random
  // hashes, so a strict allowlist isn't workable; the data is public
  // and no auth is involved, so origin laxity is fine here.
  if (
    origin === 'capacitor://app.chessacademy.pro' ||
    origin === 'https://chess-academy-pro.vercel.app' ||
    /^https:\/\/chess-academy-pro-[a-z0-9-]+-dyahnke-pros-projects\.vercel\.app$/.test(origin) ||
    origin === ''
  ) {
    base['Access-Control-Allow-Origin'] = origin || '*';
    base['Vary'] = 'Origin';
  }
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
  const source = url.searchParams.get('source') ?? 'lichess';
  if (!ALLOWED_SOURCES.has(source)) {
    return new Response(
      JSON.stringify({ error: `invalid source "${source}"; expected one of ${[...ALLOWED_SOURCES].join(', ')}` }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  // Forward every other param verbatim (fen, speeds, ratings, play, etc.).
  const upstreamParams = new URLSearchParams();
  for (const [k, v] of url.searchParams) {
    if (k === 'source') continue;
    upstreamParams.set(k, v);
  }
  const upstreamUrl = `${EXPLORER_BASE}/${source}?${upstreamParams.toString()}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': UPSTREAM_USER_AGENT,
      },
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
    const body = await upstream.text();
    // Pass through status + body. JSON content-type so the client's
    // `response.json()` parses cleanly.
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        // Cache on Vercel's edge for 60s — opening-explorer data is
        // identical for every user of the same FEN, so the same
        // shape the bare endpoint serves to other Lichess clients.
        'Cache-Control': 'public, max-age=60, s-maxage=60',
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
