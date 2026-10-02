/**
 * SEARCH UNTIL THE ANSWER STOPS CHANGING — the one computer that decides how
 * deep Stockfish looks (David 2026-09-27: "Can we algo the stockfish depth?").
 *
 * WHY. Depth was a hand-set number in each caller — 12 live, 14 for the fan,
 * 16 for review, 18 for a best move — each tuned for one surface, and the
 * review's own notes record what a fixed number costs: 6…Nb6 read 52cp at
 * depth 14, 128 at 16, 98 at 18, 78 at 20, 69 at 22. Depth 14 graded it good,
 * depth 16 a mistake; the answer the search SETTLES on is a clear inaccuracy.
 * No fixed depth is right for every position, because positions differ in how
 * far the truth hides.
 *
 * THE RULE. Deepen in steps; stop when the best move is unchanged AND the win
 * chance has held within a band over the last few depths. Sharp positions —
 * a king in check, a loose piece, many forcing moves, unequal material — must
 * reach a higher floor before stability counts, because a sacrifice can look
 * settled at 14 and flip at 20. Every purpose has a time budget; a search the
 * budget cuts off before it settles says so (`stable: false`), and callers
 * must not voice a firm verdict off it.
 *
 * TWO DEPTHS, ONLY ONE HERE. This decides how deep we SEARCH (truth). How many
 * moves of the line the coach SPEAKS is a teaching decision made elsewhere
 * (`pvDepthForRating`, need); a weaker student still gets a true verdict.
 */
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';
import { winPercent } from './accuracyService';
import { findHangingPieces } from './tacticClassifier';
import { emitSearchDepth, type SearchDepthRow } from './searchDepthEvents';

/** What the search is FOR. A new purpose fails to compile until it has a policy. */
export type SearchPurpose = 'live' | 'question' | 'review' | 'sacrifice';

export interface SearchPolicy {
  /** Floor for a quiet position; sharpness raises it. */
  readonly minDepth: number;
  readonly maxDepth: number;
  readonly step: number;
  /** Wall-clock for the whole deepening, ms. */
  readonly budgetMs: number;
  /** How many consecutive depths must agree. */
  readonly stableFor: number;
  /** How far the win chance may wander across those depths, in points. */
  readonly winBand: number;
}

export const SEARCH_POLICY: Record<SearchPurpose, SearchPolicy> = {
  // The live board cannot wait: a tight budget, and callers voice no firm
  // verdict off an unsettled search rather than stretching it.
  live: { minDepth: 10, maxDepth: 16, step: 2, budgetMs: 1500, stableFor: 2, winBand: 4 },
  // A typed question is a person waiting on an answer, not on the board.
  question: { minDepth: 12, maxDepth: 20, step: 2, budgetMs: 4000, stableFor: 2, winBand: 3 },
  // The review's key moments run behind an already-open review.
  review: { minDepth: 14, maxDepth: 22, step: 2, budgetMs: 8000, stableFor: 3, winBand: 3 },
  // "Is this sacrifice sound?" — the truth hides deepest here.
  sacrifice: { minDepth: 16, maxDepth: 26, step: 2, budgetMs: 12000, stableFor: 3, winBand: 3 },
};

const MATE_CP = 10_000;

/** How sharp the position is, 0-3: one point each for the side to move being
 *  in check, a loose piece on the board, several forcing moves, and unequal
 *  piece material. Sharp positions hide their truth deeper. */
export function sharpness(fen: string): number {
  let c: Chess;
  try { c = new Chess(fen); } catch { return 0; }
  let score = 0;
  if (c.inCheck()) score += 1;
  try { if (findHangingPieces(c).length > 0) score += 1; } catch { /* no read, no point */ }
  const forcing = c.moves({ verbose: true }).filter((m) => m.captured || /[+#]/.test(m.san)).length;
  if (forcing >= 4) score += 1;
  const V: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
  let w = 0; let b = 0;
  for (const cell of c.board().flat()) {
    if (cell && V[cell.type]) { if (cell.color === 'w') w += V[cell.type]; else b += V[cell.type]; }
  }
  if (w !== b) score += 1;
  return Math.min(3, score);
}

/** The floor a search must reach before stability can end it. */
export function floorFor(policy: SearchPolicy, sharp: number): number {
  return Math.min(policy.maxDepth, policy.minDepth + 2 * sharp);
}

export interface DepthStep { depth: number; bestMove: string; win: number }

/** White-POV win chance of an analysis, mate saturated. */
export function winOf(a: Pick<StockfishAnalysis, 'evaluation' | 'isMate' | 'mateIn'>): number {
  const cp = a.isMate && a.mateIn !== null ? Math.sign(a.mateIn) * MATE_CP : a.evaluation;
  return winPercent(cp);
}

/** Have the last `stableFor` depths agreed on the move and held the win band? */
export function isStable(steps: readonly DepthStep[], stableFor: number, winBand: number): boolean {
  if (steps.length < stableFor) return false;
  const tail = steps.slice(-stableFor);
  if (tail.some((s) => s.bestMove !== tail[0].bestMove)) return false;
  const wins = tail.map((s) => s.win);
  return Math.max(...wins) - Math.min(...wins) <= winBand;
}

/** The engine seam — the singleton and a pool worker both fit it. */
export interface DepthSearcher {
  analyzeWithBudget(fen: string, depth: number, budgetMs: number): Promise<StockfishAnalysis>;
}

export interface DeepSearch {
  analysis: StockfishAnalysis;
  depthReached: number;
  stable: boolean;
  reason: SearchDepthRow['reason'];
  sharpness: number;
  steps: DepthStep[];
}

/** Deepen until the answer settles, the ceiling is reached, or the budget
 *  runs out. Emits one `SearchDepthRow` per call. Throws only if the very
 *  first search fails — there is then nothing to answer with. */
export async function searchUntilStable(
  fen: string,
  purpose: SearchPurpose,
  engine: DepthSearcher,
  now: () => number = Date.now,
): Promise<DeepSearch> {
  const policy = SEARCH_POLICY[purpose];
  const sharp = sharpness(fen);
  const floor = floorFor(policy, sharp);
  const start = now();
  const steps: DepthStep[] = [];
  let last: StockfishAnalysis | null = null;
  let reason: SearchDepthRow['reason'] = 'max-depth';
  let stable = false;
  // Start two steps below the floor so stability at the floor has history.
  let depth = Math.max(6, floor - policy.step * (policy.stableFor - 1));
  for (;;) {
    const remaining = policy.budgetMs - (now() - start);
    if (remaining < 150 && last) { reason = 'budget'; break; }
    let a: StockfishAnalysis;
    try {
      a = await engine.analyzeWithBudget(fen, depth, Math.max(150, remaining));
    } catch (e) {
      if (!last) throw e;
      reason = 'budget';
      break;
    }
    last = a;
    steps.push({ depth: a.depth || depth, bestMove: a.bestMove, win: winOf(a) });
    // The budget cut this search short of the depth asked for.
    if (a.depth > 0 && a.depth < depth) { reason = 'budget'; break; }
    if (depth >= floor && isStable(steps, policy.stableFor, policy.winBand)) { stable = true; reason = 'stable'; break; }
    if (depth >= policy.maxDepth) { reason = 'max-depth'; break; }
    depth = Math.min(policy.maxDepth, depth + policy.step);
  }
  const analysis = last;
  const out: DeepSearch = { analysis, depthReached: steps[steps.length - 1]?.depth ?? 0, stable, reason, sharpness: sharp, steps };
  emitSearchDepth({ purpose, sharpness: sharp, minDepth: floor, depthReached: out.depthReached, stable, reason, steps, elapsedMs: now() - start });
  return out;
}
