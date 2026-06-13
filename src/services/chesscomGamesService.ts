/**
 * chesscomGamesService — client wrapper for /api/chesscom-games, the
 * ONLINE "deeper" layer for player games (David 2026-06-11). The on-disk
 * `pro-game-references.json` is the fast offline path; this reaches the
 * player's LIVE chess.com history for anything the bundle doesn't carry
 * (more games, rarer openings, any player). Read-only, public data, no
 * auth — the edge function does the archive scan + opening filter.
 *
 * Always degrades to [] on any failure (offline, proxy missing in dev,
 * rate-limit) so callers never break — the offline path already answered
 * or the coach honestly says it found nothing.
 */
import { Chess } from 'chess.js';
import { Capacitor } from '@capacitor/core';

/** Under Capacitor (native WKWebView) relative `/api/*` calls hit the dead app
 *  host, so prefix the deployed prod origin. Web/dev stay relative (same-origin
 *  proxy). Scheme-independent native detection — mirrors voiceService /
 *  lichessExplorer / coachApi (the `protocol === 'capacitor:'` sniff breaks
 *  under the `server.hostname` https origin). */
const VERCEL_ORIGIN = 'https://chess-academy-pro.vercel.app';
function apiUrl(path: string): string {
  try {
    if (Capacitor.isNativePlatform()) return `${VERCEL_ORIGIN}${path}`;
  } catch { /* @capacitor/core unavailable — fall through */ }
  if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') return `${VERCEL_ORIGIN}${path}`;
  return path;
}

export interface ChesscomGame {
  /** Bare space-delimited SAN move list (headers + clocks stripped), ready
   *  for `buildSession`. */
  pgn: string;
  opponent: string;
  opponentRating: number | null;
  result: string;
  studentSide: 'white' | 'black';
  date: string | null;
  url: string | null;
  openingName: string;
}

/** Common-name → chess.com username for the pros we know. Anything not
 *  here falls through to treating the input as a chess.com username
 *  (chess.com handles are often just the name). */
const CHESSCOM_USERNAMES: Record<string, string> = {
  carlsen: 'magnuscarlsen',
  magnus: 'magnuscarlsen',
  'magnus carlsen': 'magnuscarlsen',
  magnuscarlsen: 'magnuscarlsen',
  hikaru: 'hikaru',
  'hikaru nakamura': 'hikaru',
  nakamura: 'hikaru',
  caruana: 'fabianocaruana',
  'fabiano caruana': 'fabianocaruana',
  fabianocaruana: 'fabianocaruana',
  naroditsky: 'danielnaroditsky',
  'daniel naroditsky': 'danielnaroditsky',
  danya: 'danielnaroditsky',
  gothamchess: 'gothamchess',
  'levy rozman': 'gothamchess',
  levy: 'gothamchess',
  ericrosen: 'imrosen',
  'eric rosen': 'imrosen',
  rosen: 'imrosen',
  aman: 'chessbrah',
  'aman hambleton': 'chessbrah',
  hambleton: 'chessbrah',
  firouzja: 'firouzja2003',
  'alireza firouzja': 'firouzja2003',
  alireza: 'firouzja2003',
  nepo: 'lachesisq',
  nepomniachtchi: 'lachesisq',
  'ian nepomniachtchi': 'lachesisq',
  so: 'gmwso',
  'wesley so': 'gmwso',
};

/** Resolve a free-text player name to a chess.com username. */
export function resolveChesscomUsername(player: string): string {
  const lower = player.trim().toLowerCase();
  if (CHESSCOM_USERNAMES[lower]) return CHESSCOM_USERNAMES[lower];
  const collapsed = lower.replace(/[^a-z0-9]/g, '');
  if (CHESSCOM_USERNAMES[collapsed]) return CHESSCOM_USERNAMES[collapsed];
  // Substring match against known surnames embedded in a guessed handle.
  for (const [k, v] of Object.entries(CHESSCOM_USERNAMES)) {
    if (k.length >= 5 && (collapsed.includes(k.replace(/\s/g, '')) || k.replace(/\s/g, '').includes(collapsed))) {
      return v;
    }
  }
  // Fall through: treat the spaceless input as a username.
  return collapsed || lower;
}

/** Reduce a raw chess.com PGN (headers + move numbers + {[%clk …]}
 *  comments) to a bare space-delimited SAN list via chess.js. Returns ''
 *  if the PGN can't be parsed. */
function pgnToBareSan(pgn: string): string {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const san = chess.history();
    return san.join(' ');
  } catch {
    return '';
  }
}

export interface FetchChesscomArgs {
  player: string;
  opening: string;
  color?: 'white' | 'black';
  /** Wins only by default — never surface the player losing. */
  result?: 'win' | 'any';
  limit?: number;
  months?: number;
  signal?: AbortSignal;
}

/**
 * Fetch a player's REAL chess.com games in an opening, live. Returns []
 * on any failure or no match — callers treat that as "nothing online".
 */
export async function fetchChesscomPlayerGames(args: FetchChesscomArgs): Promise<ChesscomGame[]> {
  const username = resolveChesscomUsername(args.player);
  if (!username || !args.opening.trim()) return [];
  if (typeof fetch !== 'function') return [];

  const params = new URLSearchParams({
    username,
    opening: args.opening.trim(),
    result: args.result ?? 'win',
    limit: String(Math.min(Math.max(args.limit ?? 3, 1), 6)),
    months: String(Math.min(Math.max(args.months ?? 18, 1), 36)),
  });
  if (args.color) params.set('color', args.color);

  try {
    const resp = await fetch(apiUrl(`/api/chesscom-games?${params.toString()}`), { signal: args.signal });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { games?: unknown } | null;
    if (!data || !Array.isArray(data.games)) return [];
    const out: ChesscomGame[] = [];
    for (const raw of data.games as Array<Record<string, unknown>>) {
      const bare = pgnToBareSan(typeof raw.pgn === 'string' ? raw.pgn : '');
      if (!bare) continue; // unparseable game — skip rather than mount garbage
      const side = raw.studentSide === 'black' ? 'black' : 'white';
      out.push({
        pgn: bare,
        opponent: typeof raw.opponent === 'string' ? raw.opponent : 'Opponent',
        opponentRating: typeof raw.opponentRating === 'number' ? raw.opponentRating : null,
        result: typeof raw.result === 'string' ? raw.result : '*',
        studentSide: side,
        date: typeof raw.date === 'string' ? raw.date : null,
        url: typeof raw.url === 'string' ? raw.url : null,
        openingName: typeof raw.openingName === 'string' ? raw.openingName : args.opening,
      });
    }
    return out;
  } catch {
    return [];
  }
}
