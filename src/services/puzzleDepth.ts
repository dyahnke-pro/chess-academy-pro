/**
 * puzzleDepth — how many moves the SOLVER plays, COUNTED off the line.
 *
 * David 2026-10-01: "Are most puzzles more than one move? I want them to be."
 * The old selector asked Lichess's theme tags (`long`, `veryLong`, `mateInN`)
 * and so filed every two-move puzzle (`short`) as a one-mover — 9,000+ real
 * multi-move puzzles invisible to "prefer multi-move". A tag is a label; the
 * line is the fact.
 *
 * A Lichess line opens with the opponent's setup move, so the solver plays
 * floor(plies / 2). The training pool (kid mode, `source: 'training'`) has no
 * setup move — every ply alternates from the solver — so ceil(plies / 2).
 */
import type { PuzzleRecord } from '../types';

export function solverMoves(p: Pick<PuzzleRecord, 'moves' | 'source'>): number {
  const plies = p.moves.trim().split(/\s+/).filter(Boolean).length;
  if (plies === 0) return 0;
  return p.source === 'training' ? Math.ceil(plies / 2) : Math.floor(plies / 2);
}

/** The Long sub-tab's two lengths (David 2026-10-01: "users need access to
 *  long and very long puzzles"). Long = 3–4 moves to find, Very long = 5+. */
export type PuzzleLength = 'long' | 'veryLong';

export const LENGTH_RANGE: Record<PuzzleLength, { min: number; max: number }> = {
  long: { min: 3, max: 4 },
  veryLong: { min: 5, max: Infinity },
};

/** A PATTERN drill (Pattern Recognition → "Drill this pattern"): 1–3 moves to
 *  find, so the named pattern IS the lesson rather than one step of a long
 *  combination (live walk 2026-10-03: "Drill this pattern" on Fork opened a
 *  six-mover). Rides the nav state as `depth`, the same window the Long tab
 *  hands `getNextAdaptivePuzzle`. */
export const PATTERN_DRILL_DEPTH: { min: number; max: number } = { min: 1, max: 3 };

/** Below this puzzle rating a one-move puzzle is still fair — "one movers only
 *  for true beginners" (David). Above it, selection draws multi-move first. */
export const ONE_MOVER_CEILING = 800;
