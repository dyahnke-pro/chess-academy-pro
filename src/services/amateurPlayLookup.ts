/**
 * amateurPlayLookup
 * -----------------
 * The amateur-DB companion to `masterPlayLookup`. Where the masters
 * lookup answers "what is THEORY here" (and thins out around move
 * 12-15), this answers "what do players at the student's level
 * actually play here" — the Lichess explorer `source: 'lichess'`
 * band (blitz/rapid/classical, ratings 1600-2500), which carries FULL
 * W/D/L and far DEEPER coverage than the bundled sparse masters file.
 *
 * Used to STRENGTHEN the "where you left the book" scan (David
 * 2026-06-28: "use the amateur DB in conjunction with the masters"):
 *   - extends the scan past where masters coverage runs out, and
 *   - supplies W/D/L for masters moves the sparse local file only has
 *     a game-COUNT for (the "untested … from thousands" gap).
 *
 * Own in-memory cache (keyed by position-FEN) so amateur results never
 * collide with the masters cache, which keys the same FENs to DIFFERENT
 * data. Live-only — there is no bundled amateur asset; the scan stops at
 * the first deviation, so the live-call count per review is bounded.
 *
 * G3 contract: never invents data. Both miss / offline → `source:'none'`
 * + empty `moves[]`, never null.
 */

import { positionFen } from './masterPlayCache';
import type { MasterPlayMove, MasterPlayResult } from './masterPlayTypes';
import { fetchLichessExplorer } from './lichessExplorerService';

const cache = new Map<string, MasterPlayResult>();
const inFlight = new Map<string, Promise<MasterPlayResult>>();

export interface AmateurLookupOptions {
  /** Skip the live fetch (offline-safe callers). */
  localOnly?: boolean;
}

function emptyResult(fen: string): MasterPlayResult {
  return { fen: positionFen(fen), totalGames: 0, moves: [], source: 'none' };
}

function buildResult(fen: string, payload: { moves?: ReadonlyArray<{ san: string; uci?: string; white?: number; draws?: number; black?: number; averageRating?: number }> }): MasterPlayResult {
  const raw = payload.moves ?? [];
  const sorted = [...raw].sort((a, b) => {
    const ag = (a.white ?? 0) + (a.draws ?? 0) + (a.black ?? 0);
    const bg = (b.white ?? 0) + (b.draws ?? 0) + (b.black ?? 0);
    return bg - ag;
  });
  let totalGames = 0;
  const moves: MasterPlayMove[] = sorted.map((m) => {
    const white = m.white ?? 0;
    const draws = m.draws ?? 0;
    const black = m.black ?? 0;
    const games = white + draws + black;
    totalGames += games;
    return {
      san: m.san,
      uci: m.uci,
      games,
      white,
      draws,
      black,
      whitePct: games > 0 ? white / games : 0,
      drawPct: games > 0 ? draws / games : 0,
      blackPct: games > 0 ? black / games : 0,
      averageRating: typeof m.averageRating === 'number' ? m.averageRating : undefined,
    };
  });
  if (moves.length === 0 || totalGames === 0) return emptyResult(fen);
  return { fen: positionFen(fen), totalGames, moves, source: 'lichess-live' };
}

/** Resolve amateur-level play statistics for a position. Always returns
 *  a `MasterPlayResult` (never null); `source:'none'` when the explorer
 *  has no data / the call failed / offline / `localOnly`. */
export async function lookupAmateurPlay(
  fen: string,
  opts: AmateurLookupOptions = {},
): Promise<MasterPlayResult> {
  const key = positionFen(fen);

  const cached = cache.get(key);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  if (opts.localOnly) return emptyResult(key);
  if (typeof navigator !== 'undefined' && !navigator.onLine) return emptyResult(key);

  const promise = (async (): Promise<MasterPlayResult> => {
    try {
      const payload = await fetchLichessExplorer(key, 'lichess');
      return buildResult(key, payload);
    } catch {
      return emptyResult(key);
    }
  })();

  inFlight.set(key, promise);
  try {
    const result = await promise;
    cache.set(key, result);
    return result;
  } finally {
    inFlight.delete(key);
  }
}

/** Test-only — clear the amateur cache. */
export function __resetAmateurPlayLookupForTests(): void {
  cache.clear();
  inFlight.clear();
}
