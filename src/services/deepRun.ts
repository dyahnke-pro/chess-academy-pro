/**
 * deepRun — the "how many moves deep can you accumulate" mode (David
 * 2026-10-01: "Make each one harder than the last until I get one wrong …
 * Each puzzle should get longer each time! … It resets when you get one
 * wrong. High streak count remembered and shown up top.").
 *
 * PURE: every decision about the run lives here and is tested; the page only
 * renders it and fetches the puzzle it asks for.
 *
 *  - UNLIMITED TRIES, HINTS ON THE WAY (David 2026-10-02: "we give the user
 *    as many tries as they want to solve on their own. Make the show solution
 *    always available"). A wrong try does not end the run. Show solution does.
 *  - The SCORE is CLEAN MOVES BANKED: a solver move found with no wrong try
 *    and no hint since the last one banks 1; an assisted move banks 0 and the
 *    run goes on (David: "Only clean moves bank").
 *  - DEPTH climbs one solver move per solve, from START_DEPTH.
 *  - DIFFICULTY is a live per-run PERFORMANCE RATING (David: "Algo this to the
 *    user"). It starts at the student's own puzzle rating and moves by the
 *    same Elo expectation their puzzle rating uses, with a run-sized K: the
 *    score of a puzzle is the share of its moves found clean, so a clean solve
 *    of a hard puzzle pushes it up hard and a struggle pulls it back. Longer
 *    AND harder, at the pace the student actually plays.
 *  - No multiplier (David: "1 no"): the score stays an honest count of depth.
 */

export const START_DEPTH = 2;
/** Elo K inside a run — larger than the stored rating's 32 so one run can
 *  find the student's edge, small enough that one puzzle never swings 300. */
export const RUN_K = 96;
export const RUN_RATING_FLOOR = 400;
export const RUN_RATING_CEILING = 3000;

/** The run's next rating after a puzzle rated `puzzleRating`, scored as the
 *  share of its solver moves found clean (0..1). */
export function nextRunRating(runRating: number, puzzleRating: number, score: number): number {
  if (!Number.isFinite(puzzleRating)) return runRating;
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - runRating) / 400));
  const s = Math.max(0, Math.min(1, score));
  const next = Math.round(runRating + RUN_K * (s - expected));
  return Math.max(RUN_RATING_FLOOR, Math.min(RUN_RATING_CEILING, next));
}

export interface Rank { min: number; name: string }

/** Rank tiers on moves banked in ONE run. The names are chess, not casino. */
export const RANKS: readonly Rank[] = [
  { min: 0, name: 'Spark' },
  { min: 10, name: 'Calculator' },
  { min: 25, name: 'Tactician' },
  { min: 45, name: 'Deep Thinker' },
  { min: 70, name: 'Combinator' },
  { min: 100, name: 'Visualizer' },
  { min: 140, name: 'Grandmaster Eye' },
  { min: 200, name: 'Engine' },
];

export function rankFor(banked: number): Rank {
  let r = RANKS[0];
  for (const t of RANKS) if (banked >= t.min) r = t;
  return r;
}

export function nextRank(banked: number): Rank | null {
  return RANKS.find((t) => t.min > banked) ?? null;
}

export interface DeepRunState {
  /** Solver moves the NEXT puzzle should have. */
  depth: number;
  /** The live performance rating the next puzzle is pitched at. */
  targetRating: number;
  banked: number;
  solved: number;
  /** The remembered best at the START of this run. */
  bestBefore: number;
  over: boolean;
}

export function startRun(puzzleRating: number, best: number): DeepRunState {
  return {
    depth: START_DEPTH,
    targetRating: Math.max(RUN_RATING_FLOOR, Math.min(RUN_RATING_CEILING, Math.round(puzzleRating))),
    banked: 0,
    solved: 0,
    bestBefore: best,
    over: false,
  };
}

/** What a solve earned — each flag fires the matching reward exactly once. */
export interface SolveResult {
  state: DeepRunState;
  levelUp: boolean;
  rankUp: Rank | null;
  /** True only on the solve that FIRST passes the remembered best. */
  newBest: boolean;
}

export interface SolvedPuzzle {
  /** Solver moves the puzzle actually had (the pool may serve shallower). */
  servedDepth: number;
  /** Of those, how many were found with no wrong try and no hint. */
  cleanMoves: number;
  /** The puzzle's own rating — what the performance is measured against. */
  puzzleRating: number;
  /** The pool had nothing at the asked depth, so depth cannot climb. */
  capped: boolean;
}

/** Bank a solved puzzle: clean moves score, depth climbs, the run rating
 *  follows the performance. */
export function solve(s: DeepRunState, p: SolvedPuzzle): SolveResult {
  const clean = Math.max(0, Math.min(p.servedDepth, p.cleanMoves));
  const banked = s.banked + clean;
  const before = rankFor(s.banked);
  const after = rankFor(banked);
  const climbDepth = !p.capped;
  const score = p.servedDepth > 0 ? clean / p.servedDepth : 0;
  const state: DeepRunState = {
    ...s,
    banked,
    solved: s.solved + 1,
    depth: climbDepth ? s.depth + 1 : s.depth,
    targetRating: nextRunRating(s.targetRating, p.puzzleRating, score),
  };
  return {
    state,
    levelUp: climbDepth,
    rankUp: after.min > before.min ? after : null,
    newBest: s.bestBefore > 0 && s.banked <= s.bestBefore && banked > s.bestBefore,
  };
}

export function miss(s: DeepRunState): DeepRunState {
  return { ...s, over: true };
}

export function bestAfter(s: DeepRunState): number {
  return Math.max(s.bestBefore, s.banked);
}
