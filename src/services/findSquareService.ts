/**
 * findSquareService — record + aggregate Find-the-Square drill attempts.
 *
 * Drill loop:
 *   1. Student picks color (pawn position a2 white / h7 black on a
 *      flipped or normal board so the pawn is always at the BOTTOM).
 *   2. Random target square pops up — text and/or voice.
 *   3. Student clicks a square.
 *   4. chess.js validates the click matches the target.
 *   5. recordAttempt() writes one row to db.findSquareAttempts.
 *   6. /weaknesses aggregates over the rows for a blind-squares
 *      heatmap.
 *
 * No adaptive tier system. Per David's 2026-05-19 spec: random
 * squares, surface-toggle for coords, voice toggle, sequence mode
 * grows length with streak.
 */
import { db } from '../db/schema';
import type { FindSquareAttempt } from '../types';

const ALL_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const ALL_RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

/** Algebraic name for every square on the board. Used to draw a
 *  random target. */
export const ALL_SQUARES: readonly string[] = (() => {
  const out: string[] = [];
  for (const f of ALL_FILES) for (const r of ALL_RANKS) out.push(`${f}${r}`);
  return out;
})();

export interface DrawTargetOptions {
  /** Exclude squares already used in the current sequence so the
   *  student doesn't get the same prompt twice in a row. */
  exclude?: ReadonlySet<string>;
}

/** Uniformly pick a square from the 64-square pool minus excludes.
 *  Falls back to an unfiltered pick if `exclude` somehow covers all
 *  64 (defensive — sequences never reach length 64). */
export function drawRandomSquare(options: DrawTargetOptions = {}): string {
  const exclude = options.exclude ?? new Set<string>();
  const pool = ALL_SQUARES.filter((s) => !exclude.has(s));
  if (pool.length === 0) return ALL_SQUARES[Math.floor(Math.random() * ALL_SQUARES.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Sequence length grows with streak. Single mode is always 1; the
 *  caller picks the mode and passes streak — this function only
 *  decides "how many squares per round in sequence mode given this
 *  streak":
 *    streak 0-2  → 2
 *    streak 3-5  → 3
 *    streak 6-9  → 4
 *    streak 10+  → 5
 *  Tops out at 5 — beyond that the cognitive load on a one-time
 *  display becomes unfair. */
export function sequenceLengthForStreak(streak: number): number {
  if (streak >= 10) return 5;
  if (streak >= 6) return 4;
  if (streak >= 3) return 3;
  return 2;
}

/** Persist a single attempt and return the saved record. Caller
 *  builds the input — service is stateless and doesn't track
 *  streaks (component-local state). */
export async function recordAttempt(
  input: Omit<FindSquareAttempt, 'id' | 'timestamp'>,
): Promise<FindSquareAttempt> {
  const attempt: FindSquareAttempt = {
    id: `fs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    ...input,
  };
  await db.findSquareAttempts.put(attempt);
  return attempt;
}

export interface SquareHeatmapEntry {
  square: string;
  attempts: number;
  correct: number;
  /** Avg correct-only solve time in ms. NaN when there are 0 correct
   *  attempts. */
  avgCorrectMs: number;
  /** Wrong attempts as a fraction of total — surfaces "blind
   *  squares" the student keeps mis-clicking. */
  errorRate: number;
}

/** Aggregate all recorded attempts into a per-square heatmap. Used
 *  by /weaknesses to surface "your slow squares are g5, b3, e6"
 *  insights. Recency-weighted scoring is a future iteration; for
 *  now it's a flat average over the lifetime of the rows. */
export async function getSquareHeatmap(): Promise<SquareHeatmapEntry[]> {
  const all = await db.findSquareAttempts.toArray();
  const bySquare = new Map<string, { attempts: number; correct: number; correctMs: number[] }>();
  for (const a of all) {
    const cur = bySquare.get(a.target) ?? { attempts: 0, correct: 0, correctMs: [] };
    cur.attempts += 1;
    if (a.correct) {
      cur.correct += 1;
      cur.correctMs.push(a.durationMs);
    }
    bySquare.set(a.target, cur);
  }
  const out: SquareHeatmapEntry[] = [];
  for (const square of ALL_SQUARES) {
    const stats = bySquare.get(square);
    if (!stats) continue;
    out.push({
      square,
      attempts: stats.attempts,
      correct: stats.correct,
      avgCorrectMs: stats.correctMs.length > 0
        ? stats.correctMs.reduce((a, b) => a + b, 0) / stats.correctMs.length
        : NaN,
      errorRate: stats.attempts > 0 ? (stats.attempts - stats.correct) / stats.attempts : 0,
    });
  }
  return out;
}

/** Best (highest) streak ever recorded. Derived from the rows by
 *  walking them in timestamp order and counting consecutive correct
 *  attempts (resets on the first wrong). */
export async function getBestStreak(): Promise<number> {
  const all = await db.findSquareAttempts.orderBy('timestamp').toArray();
  let best = 0;
  let current = 0;
  for (const a of all) {
    if (a.correct) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}
