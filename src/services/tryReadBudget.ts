/**
 * THE ENGINE BUDGET FOR A BOARD READ'S TRIES, PER SURFACE (CLAUDE.md G4.5 /
 * G4.6, 2026-11-19).
 *
 * A board read (`boardReadFacts`) reads every try its sources give — the eye's
 * candidates, the plan's direct tries and every reason try (`consideredTries`),
 * their replies after the best move — one engine read each. G4.5: no source is
 * cut by a count. What a surface decides is how DEEP and how LONG each read
 * runs, by its source, and whether the reads go through the worker pool:
 *  - a live board (Learn, Play, the Openings Play rung, a puzzle) must answer
 *    while the student waits: every try shallow, all of them in parallel on
 *    the pool, so N reads cost about the slowest instead of the sum (G4.6);
 *  - Review runs in the background: the TEMPTING tries (the eye's and the
 *    considered ones) read deep, since a try that costs a pawn at depth 18 can
 *    read as small at 14 (about 25 of Naroditsky's ?/?! tries did) and a
 *    shallow read would let it pass.
 * The board after the best move is read on the singleton on every surface:
 * the best move's facts read its MultiPV fan, which a pool worker does not
 * give.
 *
 * A `Record` over every surface and every source: a new surface, or a new
 * reason a try is weighed for (`ConsideredWhy`), fails to compile here until
 * it says its budget.
 */
import type { ConsideredWhy } from './weighedMoves';
import type { AnalysisLine } from '../types';

/** The surfaces that mount a board read (`usePositionNarration`). */
export type ReadSurface = 'learn' | 'play' | 'openings' | 'puzzle' | 'review';

/** Where a read's board comes from:
 *  - `eye`: a move a player at the rating is drawn to (`candidateMoves`);
 *  - `plan` and every `ConsideredWhy`: a move weighed for a reason
 *    (`tryCandidates.consideredTries`);
 *  - `their-eye`: their likely reply after our best move;
 *  - `best-after`: the board after the engine's best move (its fan);
 *  - `future`: a board down a try's line or the best line, read for the
 *    engine-backed computers (`futures.changeReasonWithEngine`). */
export type TrySource = 'eye' | 'plan' | ConsideredWhy | 'their-eye' | 'best-after' | 'future';

export interface ReadBudget {
  depth: number;
  /** The search stops this long after it starts, with the line it reached. */
  budgetMs: number;
}

export interface SurfaceReadBudget {
  /** Read the tries on the worker pool, in parallel (the singleton otherwise). */
  pool: boolean;
  /** A try no pure reader finds a reason for is read again with the
   *  engine-backed computers on its futures (`changeReasonWithEngine`): a
   *  dozen extra reads a try, so only where the read runs in the background. */
  engineFutures: boolean;
  reads: Record<TrySource, ReadBudget>;
}

/** Today's live read (`positionReadComposer`'s depth and budget, 2026-09). */
const LIVE: ReadBudget = { depth: 12, budgetMs: 300 };
/** A tempting try in Review: deep enough that its cost is real. */
const DEEP: ReadBudget = { depth: 18, budgetMs: 3_000 };
/** Their replies and the best move's board in Review. */
const REVIEW: ReadBudget = { depth: 14, budgetMs: 1_500 };

function every(tempting: ReadBudget, theirs: ReadBudget, bestAfter: ReadBudget): Record<TrySource, ReadBudget> {
  return {
    eye: tempting, plan: tempting, capture: tempting, check: tempting, passer: tempting, king: tempting,
    threat: tempting, defence: tempting, 'mate-threat': tempting, lever: tempting, double: tempting, reroute: tempting,
    'their-eye': theirs, 'best-after': bestAfter, future: theirs,
  };
}

export const TRY_READ_BUDGET: Record<ReadSurface, SurfaceReadBudget> = {
  learn: { pool: true, engineFutures: false, reads: every(LIVE, LIVE, LIVE) },
  play: { pool: true, engineFutures: false, reads: every(LIVE, LIVE, LIVE) },
  openings: { pool: true, engineFutures: false, reads: every(LIVE, LIVE, LIVE) },
  puzzle: { pool: true, engineFutures: false, reads: every(LIVE, LIVE, LIVE) },
  review: { pool: true, engineFutures: true, reads: every(DEEP, REVIEW, REVIEW) },
};

export function tryReadBudget(surface: ReadSurface): SurfaceReadBudget {
  return TRY_READ_BUDGET[surface];
}

/** The longest search a surface's pooled reads ask for. */
export function poolBudgetMs(surface: ReadSurface): number {
  const b = TRY_READ_BUDGET[surface];
  return Math.max(...(Object.keys(b.reads) as TrySource[]).filter((s) => s !== 'best-after').map((s) => b.reads[s].budgetMs));
}

/** One engine of a pool: reads a board to a depth within a budget. */
export interface PoolReadEngine {
  read(fen: string, budget: ReadBudget): Promise<readonly AnalysisLine[] | null>;
}

/**
 * Spreads reads over the pool's engines: each engine runs one search at a time
 * (a worker cannot run two), a read goes to the engine with the fewest waiting,
 * so N reads on K engines cost about N/K searches. Pure: the engines are
 * handed in.
 */
export function poolDispatcher(engines: readonly PoolReadEngine[]): (fen: string, budget: ReadBudget) => Promise<readonly AnalysisLine[] | null> {
  const lanes = engines.map((e) => ({ e, waiting: 0, tail: Promise.resolve() as Promise<unknown> }));
  return (fen, budget) => {
    if (lanes.length === 0) return Promise.resolve(null);
    const lane = lanes.reduce((x, y) => (y.waiting < x.waiting ? y : x));
    lane.waiting += 1;
    const run = lane.tail.then(() => lane.e.read(fen, budget));
    lane.tail = run.catch(() => undefined);
    return run.finally(() => { lane.waiting -= 1; });
  };
}
