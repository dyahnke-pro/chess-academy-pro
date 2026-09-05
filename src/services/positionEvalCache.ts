import { db, type PositionEvalRecord } from '../db/schema';

/**
 * Per-position Stockfish eval cache — the app's answer to chess.com's
 * pre-computed opening evals (David 2026-09-05, "how does chess.com get a game
 * analysis done so quickly?" → "two and three please").
 *
 * The same position recurs constantly across ONE player's library: every game
 * in a repertoire shares its first 10-20 plies, transpositions repeat
 * middlegames, and a re-analysis (depth upgrade, re-import) walks positions the
 * engine already scored. Each hit here is a search the phone does not run.
 *
 * Contract:
 *   - Keys are the 4-field FEN (placement / side / castling / ep) — the move
 *     counters do not change the evaluation and would only split the cache.
 *   - Evals are centipawns, White POV — the unit both engine paths already
 *     return, so a cached value is interchangeable with a fresh one.
 *   - DEPTH-MONOTONIC. A row is only ever replaced by a DEEPER search, and a
 *     lookup demands a minimum depth, so a shallow batch eval can never be
 *     served to the full-depth review.
 *   - FAIL-OPEN. Every function swallows storage errors and degrades to "no
 *     cache": a Dexie hiccup must never cost a game its analysis.
 */

/** Rows above this trigger a prune (≈ 1,000 forty-move games). */
export const EVAL_CACHE_MAX_ROWS = 60_000;
/** Prune trims oldest-first down to this many rows. */
export const EVAL_CACHE_PRUNE_TO = 45_000;

export interface CachedEval {
  evaluation: number;
  depth: number;
  bestMove: string | null;
}

export interface EvalToStore {
  fen: string;
  evaluation: number;
  depth: number;
  bestMove?: string | null;
}

/** 4-field FEN: strips the halfmove + fullmove counters. */
export function evalCacheKey(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 4).join(' ');
}

/**
 * Cached evals for `fens`, keyed by INDEX into the input, including only rows
 * whose reached depth is at least `minDepth`. One bulkGet, never per-position.
 */
export async function lookupPositionEvals(
  fens: readonly string[],
  minDepth: number,
): Promise<Map<number, CachedEval>> {
  const hits = new Map<number, CachedEval>();
  if (fens.length === 0) return hits;
  try {
    const keys = fens.map(evalCacheKey);
    const rows = await db.positionEvals.bulkGet(keys);
    rows.forEach((row, i) => {
      if (!row || !Number.isFinite(row.evaluation) || row.depth < minDepth) return;
      hits.set(i, { evaluation: row.evaluation, depth: row.depth, bestMove: row.bestMove });
    });
  } catch {
    // fail-open: no cache
  }
  return hits;
}

/**
 * Persist evals, deepest wins. Returns how many rows were written.
 * A shallower (or equal-depth, no-new-info) result never overwrites a deeper one.
 */
export async function storePositionEvals(entries: readonly EvalToStore[]): Promise<number> {
  // Dedupe within the batch — keep the deepest per key.
  const byKey = new Map<string, EvalToStore>();
  for (const e of entries) {
    if (!Number.isFinite(e.evaluation) || !Number.isFinite(e.depth) || e.depth <= 0) continue;
    const key = evalCacheKey(e.fen);
    const prev = byKey.get(key);
    if (!prev || e.depth > prev.depth || (e.depth === prev.depth && e.bestMove && !prev.bestMove)) {
      byKey.set(key, { ...e, fen: key });
    }
  }
  if (byKey.size === 0) return 0;
  try {
    const keys = [...byKey.keys()];
    const existing = await db.positionEvals.bulkGet(keys);
    const now = Date.now();
    const writes: PositionEvalRecord[] = [];
    keys.forEach((key, i) => {
      const next = byKey.get(key);
      if (!next) return;
      const prev = existing[i];
      const nextBest = next.bestMove ?? null;
      if (prev) {
        if (next.depth < prev.depth) return;
        if (next.depth === prev.depth && (!nextBest || prev.bestMove)) return;
      }
      writes.push({
        fen: key,
        evaluation: next.evaluation,
        depth: next.depth,
        // A deeper search without a best move invalidates the shallower one's;
        // an equal-depth write only ever ADDS a best move.
        bestMove: nextBest ?? (prev && prev.depth === next.depth ? prev.bestMove : null),
        updatedAt: now,
      });
    });
    if (writes.length > 0) await db.positionEvals.bulkPut(writes);
    return writes.length;
  } catch {
    return 0;
  }
}

/** Oldest-first trim once the store passes `maxRows` (EVAL_CACHE_MAX_ROWS),
 *  down to `pruneTo`. Returns rows deleted. The bounds are parameters only so
 *  the gate can exercise the trim without writing 60k rows. */
export async function prunePositionEvalCache(
  maxRows: number = EVAL_CACHE_MAX_ROWS,
  pruneTo: number = EVAL_CACHE_PRUNE_TO,
): Promise<number> {
  try {
    const count = await db.positionEvals.count();
    if (count <= maxRows) return 0;
    const excess = count - pruneTo;
    const keys = await db.positionEvals.orderBy('updatedAt').limit(excess).primaryKeys();
    await db.positionEvals.bulkDelete(keys);
    return keys.length;
  } catch {
    return 0;
  }
}
