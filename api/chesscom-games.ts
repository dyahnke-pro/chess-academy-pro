/**
 * /api/chesscom-games — server-side proxy + scanner for the chess.com
 * public Published-Data API (read-only, no auth). The coach's ONLINE
 * "deeper" layer for player games (David 2026-06-11: "a good chunk
 * downloaded to disc for quick lookup, then online access to it for
 * deeper questions"). The on-disk `pro-game-references.json` is the fast
 * offline path; THIS is the live tail — any player, any opening, pulled
 * from their actual chess.com history on demand.
 *
 * Why a proxy: chess.com's pub API doesn't set permissive CORS and
 * sometimes 403s requests without a real User-Agent — same class of
 * problem as the Lichess explorer (see api/lichess-explorer.ts). Routing
 * through a Vercel Edge function fixes both and keeps the client simple.
 *
 * chess.com has NO opening-filtered endpoint, so we scan the player's
 * monthly archives newest-first and filter each game by the opening slug
 * in its `eco` URL (e.g. ".../openings/Catalan-Opening-..."), plus
 * optional color + result. Bounded by `months` and an overall deadline so
 * the edge budget is never blown.
 *
 *   GET /api/chesscom-games?username=magnuscarlsen&opening=catalan
 *       &color=white&result=win&limit=3&months=18
 *
 * Returns: { games: [{ pgn, opponent, opponentRating, result,
 *   studentSide, date, url, openingName }], scanned, matched }.
 */
export const config = { runtime: 'edge' };

const PUB_BASE = 'https://api.chess.com/pub/player';
const UA =
  'ChessAcademyPro/1.0 (https://chess-academy-pro.vercel.app; contact: dyahnke@gmail.com)';
// Overall wall-clock budget for the whole scan. Edge functions get ~25s;
// leave headroom so we always return a clean result rather than a 504.
const DEADLINE_MS = 20_000;
const PER_FETCH_TIMEOUT_MS = 6_000;

interface ChesscomSide {
  username: string;
  rating?: number;
  result?: string;
}
interface ChesscomGame {
  url?: string;
  pgn?: string;
  rules?: string;
  end_time?: number;
  eco?: string;
  white?: ChesscomSide;
  black?: ChesscomSide;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Pull the opening slug out of a chess.com `eco` URL and humanize it.
 *  ".../openings/Catalan-Opening-3.g3" → "Catalan Opening". */
function openingFromEcoUrl(ecoUrl: string | undefined): string {
  if (!ecoUrl) return '';
  const m = ecoUrl.match(/\/openings\/([^/?#]+)/);
  if (!m) return '';
  // Drop the trailing move-tag (e.g. "-3.g3-d5") and dash-join the name.
  const slug = m[1].replace(/-\d+\..*$/, '');
  return slug.replace(/-/g, ' ').trim();
}

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PER_FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

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
    base['Vary'] = 'Origin';
  }
  return base;
}

export default async function handler(req: Request): Promise<Response> {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  const url = new URL(req.url);
  const username = (url.searchParams.get('username') ?? '').trim().toLowerCase();
  const opening = norm(url.searchParams.get('opening') ?? '');
  const colorParam = url.searchParams.get('color');
  const color = colorParam === 'white' || colorParam === 'black' ? colorParam : null;
  const resultParam = (url.searchParams.get('result') ?? 'win').toLowerCase();
  const winsOnly = resultParam !== 'any';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 3, 1), 6);
  const months = Math.min(Math.max(Number(url.searchParams.get('months')) || 18, 1), 36);

  if (!username) return json({ error: 'username is required', games: [] }, 400);
  if (!opening) return json({ error: 'opening is required', games: [] }, 400);

  const started = Date.now();

  const archivesDoc = await fetchJson(`${PUB_BASE}/${encodeURIComponent(username)}/games/archives`);
  const archives =
    archivesDoc && Array.isArray((archivesDoc as { archives?: unknown }).archives)
      ? ((archivesDoc as { archives: string[] }).archives)
      : [];
  if (archives.length === 0) {
    return json({ error: 'no-archives', games: [], scanned: 0, matched: 0 });
  }

  const toScan = archives.slice(-months).reverse(); // newest months first
  const games: Array<Record<string, unknown>> = [];
  let scanned = 0;

  for (const archiveUrl of toScan) {
    if (Date.now() - started > DEADLINE_MS) break;
    if (games.length >= limit) break;
    const monthDoc = await fetchJson(archiveUrl);
    const monthGames =
      monthDoc && Array.isArray((monthDoc as { games?: unknown }).games)
        ? ((monthDoc as { games: ChesscomGame[] }).games)
        : [];
    scanned += monthGames.length;

    // Newest games within the month first.
    for (let i = monthGames.length - 1; i >= 0; i--) {
      const g = monthGames[i];
      if (g.rules && g.rules !== 'chess') continue;
      const whiteUser = (g.white?.username ?? '').toLowerCase();
      const blackUser = (g.black?.username ?? '').toLowerCase();
      const side: 'white' | 'black' | null =
        whiteUser === username ? 'white' : blackUser === username ? 'black' : null;
      if (!side) continue;
      if (color && side !== color) continue;

      const ecoName = openingFromEcoUrl(g.eco);
      if (!ecoName || !norm(ecoName).includes(opening)) continue;

      const whiteWon = g.white?.result === 'win';
      const blackWon = g.black?.result === 'win';
      const resultStr = whiteWon ? '1-0' : blackWon ? '0-1' : '1/2-1/2';
      const sideResult = side === 'white' ? g.white?.result : g.black?.result;
      const isDraw = !whiteWon && !blackWon;
      const studentWon = sideResult === 'win';
      // Never surface the player LOSING (parity with the on-disk lookup).
      if (!studentWon && !isDraw) continue;
      if (winsOnly && !studentWon) continue;

      const opp = side === 'white' ? g.black : g.white;
      games.push({
        pgn: g.pgn ?? '',
        opponent: opp?.username ?? 'Opponent',
        opponentRating: typeof opp?.rating === 'number' ? opp.rating : null,
        result: resultStr,
        studentSide: side,
        date: g.end_time ? new Date(g.end_time * 1000).getUTCFullYear().toString() : null,
        url: g.url ?? null,
        openingName: ecoName,
      });
      if (games.length >= limit) break;
    }
  }

  return json({ games, scanned, matched: games.length });
}
