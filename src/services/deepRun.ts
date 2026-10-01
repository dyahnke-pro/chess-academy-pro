/**
 * deepRun — the "how many moves deep can you accumulate" mode (David
 * 2026-10-01: "Make each one harder than the last until I get one wrong …
 * Each puzzle should get longer each time! … It resets when you get one
 * wrong. High streak count remembered and shown up top.").
 *
 * PURE: every decision about the run lives here and is tested; the page only
 * renders it and fetches the puzzle it asks for.
 *
 *  - The SCORE is MOVES BANKED: the solver moves of every puzzle solved this
 *    run. A six-mover banks six. Depth is the thing being rewarded, so a run
 *    of five two-movers (10) loses to a pair of sixes (12).
 *  - DEPTH climbs one solver move per solve, from START_DEPTH. Where the
 *    pool has nothing deeper at this rating (the CC0 data is thin below 800),
 *    depth holds and the RATING climbs instead — harder every time, either way.
 *  - A miss (or Show solution) ENDS the run. The next run starts at
 *    START_DEPTH — two, not one: one-movers are for true beginners only.
 *  - No multiplier (David: "1 no"): the score stays an honest count of depth.
 */

export const START_DEPTH = 2;
/** Rating step when depth can climb no further in the pool. */
export const RATING_STEP = 75;
/** A run opens a little under the student's puzzle rating — the length is
 *  the difficulty at first, the rating joins in later. */
export const START_RATING_OFFSET = -100;

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
    targetRating: Math.max(400, Math.round(puzzleRating + START_RATING_OFFSET)),
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

/**
 * Bank a solved puzzle. `servedDepth` is the depth actually played (the pool
 * may have served shallower than asked); `capped` says the pool had nothing
 * deeper at this rating, so the rating climbs instead of the depth.
 */
export function solve(s: DeepRunState, servedDepth: number, capped: boolean): SolveResult {
  const banked = s.banked + servedDepth;
  const before = rankFor(s.banked);
  const after = rankFor(banked);
  const climbDepth = !capped;
  const state: DeepRunState = {
    ...s,
    banked,
    solved: s.solved + 1,
    depth: climbDepth ? s.depth + 1 : s.depth,
    targetRating: climbDepth ? s.targetRating : s.targetRating + RATING_STEP,
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
