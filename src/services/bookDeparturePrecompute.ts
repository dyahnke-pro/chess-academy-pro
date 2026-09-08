// bookDeparturePrecompute — the ASYNC half of the book-departure signal (Phase 3).
//
// findTheoryDeparture is async + DB-backed (the masters DB); running it over
// every game on the /weaknesses hot read path would be wrong (the aggregators
// there are all sync + pure). So this module precomputes per-game departures
// ONCE, caches the result in the `meta` KV store, and lets getUnifiedWeaknessProfile
// read the cache cheaply (one meta.get) + fire a background refresh when stale —
// stale-while-revalidate. Masters-DB-only: we pass a no-op amateurFetch so NO
// per-game Lichess network call fires (the amateur "your level" stat isn't needed
// for the cost-gated weakness — only the masters main line + the departure ply).
//
// The COST of a departure is the out-of-book move's cpLoss, read straight off the
// game's own Stockfish annotations (bestMoveEval − evaluation, student POV) — the
// same eval source detectConversionFailures uses. No fresh engine work. G0/G3:
// the departure ply + main line are the masters DB's; the cost is the annotations'.

import { Chess } from 'chess.js';
import { db } from '../db/schema';
import type { GameRecord } from '../types';
import { findTheoryDeparture } from './theoryDeparture';
import { resolvePlayerColor } from './conversionDetector';
import type { BookDepartureRow } from './bookDepartureWeakness';

const META_KEY = 'book-departure-rows.v1';
const TTL_MS = 12 * 60 * 60 * 1000; // recompute at most twice a day
const MAX_GAMES = 40;               // most-recent fully-analyzed games (bound the scan)
const noAmateur = async (): Promise<null> => null; // masters-DB-only — no Lichess network

interface CacheShape { at: number; gameCount: number; rows: BookDepartureRow[]; }
interface Names { lichessUsername?: string; chessComUsername?: string; }

/** Build (fens, sans) for one game from its annotations' SANs — the shape
 *  findTheoryDeparture wants (fens = every position incl. start; sans = moves). */
function fensAndSans(game: GameRecord): { fens: string[]; sans: string[] } | null {
  const anns = game.annotations;
  if (!anns || anns.length < 2) return null;
  try {
    const c = new Chess();
    const fens: string[] = [c.fen()];
    const sans: string[] = [];
    for (const a of anns) {
      if (!a.san) break;
      const mv = c.move(a.san);
      if (!mv) return null;
      sans.push(a.san);
      fens.push(c.fen());
    }
    return sans.length >= 2 ? { fens, sans } : null;
  } catch {
    return null;
  }
}

/** The out-of-book move's cpLoss (student POV) from the game's annotations — how
 *  much leaving book cost vs the engine's best. 0 when it can't be proven. */
function departureCostCp(game: GameRecord, departurePly: number, color: 'white' | 'black'): number {
  const anns = game.annotations;
  if (!anns) return 0;
  const a = anns[departurePly - 1]; // departure move is sans[departurePly-1]
  if (!a || a.evaluation === null || a.evaluation === undefined
    || a.bestMoveEval === null || a.bestMoveEval === undefined) return 0;
  const sign = color === 'white' ? 1 : -1;
  return sign * (a.bestMoveEval - a.evaluation);
}

/** Compute per-game departures (async, masters-only). Bounded to the most recent
 *  fully-analyzed games so the scan stays cheap. */
export async function computeBookDepartureRows(
  games: readonly GameRecord[],
  names: Names,
  rating: number,
): Promise<BookDepartureRow[]> {
  const recent = games
    .filter((g) => g.fullyAnalyzed && g.annotations && g.annotations.length >= 4)
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
    .slice(0, MAX_GAMES);
  const rows: BookDepartureRow[] = [];
  for (const game of recent) {
    const color = resolvePlayerColor(game, names);
    if (!color) continue;
    const fs = fensAndSans(game);
    if (!fs) continue;
    let dep;
    try {
      dep = await findTheoryDeparture(fs.fens, fs.sans, { studentRating: rating, amateurFetch: noAmateur });
    } catch { dep = null; }
    if (!dep) continue;
    // Only the STUDENT's own departure counts — the departure move is sans[ply-1];
    // its mover is white on odd plies (1-based).
    const moverIsWhite = dep.departurePly % 2 === 1;
    if (moverIsWhite !== (color === 'white')) continue;
    rows.push({
      gameId: game.id,
      departurePly: dep.departurePly,
      departedSan: dep.departedSan,
      mainSan: dep.mainMove.san,
      bookFen: dep.bookFen,
      evalCostCp: departureCostCp(game, dep.departurePly, color),
      openingId: game.openingId,
      openingName: null,
      playedAt: Date.parse(game.date) || 0,
    });
  }
  return rows;
}

async function readCache(): Promise<CacheShape | null> {
  try {
    const rec = await db.meta.get(META_KEY);
    if (!rec || typeof rec.value !== 'string') return null;
    return JSON.parse(rec.value) as CacheShape;
  } catch { return null; }
}

let refreshing = false;
async function refresh(games: readonly GameRecord[], names: Names, rating: number): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    const rows = await computeBookDepartureRows(games, names, rating);
    await db.meta.put({ key: META_KEY, value: JSON.stringify({ at: Date.now(), gameCount: games.length, rows } satisfies CacheShape) });
  } catch { /* best-effort — the cache just stays stale */ }
  finally { refreshing = false; }
}

/**
 * The hot-path read: return the cached rows synchronously-cheaply (one meta.get),
 * and fire a background refresh (never awaited) when the cache is missing, stale,
 * or the game count changed. First call after new games returns the last cache
 * (or [] cold); the refreshed rows land on the next profile build — the
 * "precompute once per game, stay scoped" contract (David 2026-09-08).
 */
export async function getCachedBookDepartureRows(
  games: readonly GameRecord[],
  names: Names,
  rating: number,
): Promise<BookDepartureRow[]> {
  const cache = await readCache();
  const stale = !cache || Date.now() - cache.at > TTL_MS || cache.gameCount !== games.length;
  if (stale) void refresh(games, names, rating);
  return cache?.rows ?? [];
}
