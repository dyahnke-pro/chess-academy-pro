// annotationReprice — ONE PRICE FOR A STORED MOVE (#2 root cause 4, L6).
//
// An analysed game's annotation that carries no one-search `costCp` was
// priced the old way: the read of the position before the move minus a
// separate read after it, two searches at two horizons that disagreed by a
// pawn or more (Kg5: 63 at the door, 115 in the record, 112-142 at depth 20).
// The record reads that number (`measuredCpLoss` falls back to the two evals),
// so every slip row, every held/broken capability row and every mistake puzzle
// built from such a game carried the split.
//
// This computer re-prices those annotations with the SETTLED one price
// (`playedMoveGrade.settledMovePrice`, the routine behind the live door): the
// played move and the best move scored in ONE search, deepened at a band edge,
// the band regraded from that search's two scores (`classifyCpLoss`). The
// difference from the review: every student move off the stored best move is
// priced, not only the moves the two reads flagged — a move the split hid
// (graded clean at 63, a mistake at 115+) is exactly the row the record lost.
// No Dexie; the scorer is handed in.
import type { MoveAnnotation, MoveClassification } from '../types';
import { uciOfSan } from './moveCost';
import { settledMovePrice } from './playedMoveGrade';
import type { MoveScorer } from './pvPlayback';
import { classifyCpLoss } from './gameAnalysisService';

const FAULTS: ReadonlySet<MoveClassification> = new Set(['inaccuracy', 'mistake', 'blunder']);

export interface RepriceChange {
  /** Index into the annotations array. */
  index: number;
  fenBefore: string;
  san: string;
  before: { classification: MoveClassification; cpLoss: number | null };
  after: { classification: MoveClassification; cpLoss: number };
}

export interface RepriceResult {
  annotations: MoveAnnotation[];
  /** Student moves given a one-search price (incl. the stored best move, cost 0). */
  priced: number;
  /** Moves whose label moved (fault ↔ not, or between bands). */
  changes: RepriceChange[];
}

/** The two-read cost the record read before this pass (mover POV, >= 0). */
function twoReadCost(ann: MoveAnnotation): number | null {
  if (ann.evaluation === null || ann.bestMoveEval === null || ann.bestMoveEval === undefined) return null;
  const sign = ann.color === 'white' ? 1 : -1;
  return Math.max(0, (ann.bestMoveEval - ann.evaluation) * sign);
}

/** Does this annotation still carry the old two-read price? */
function needsReprice(ann: MoveAnnotation, playerColor: 'white' | 'black'): boolean {
  return ann.color === playerColor && typeof ann.costCp !== 'number' && !!ann.bestMove;
}

/**
 * Re-price the student's moves of one game. `fens[i]` is the position BEFORE
 * ply i. A move the engine prices as a mate (no centipawn price) keeps its
 * annotation; so does a move with no stored best move.
 */
export async function repriceAnnotations(input: {
  annotations: readonly MoveAnnotation[];
  fens: readonly string[];
  playerColor: 'white' | 'black';
  scorer: MoveScorer;
  depth: number;
  /** Awaited between two priced moves — the backfill hands the thread back. */
  yieldBetween?: () => Promise<void>;
}): Promise<RepriceResult> {
  const out = input.annotations.map((a) => ({ ...a }));
  const changes: RepriceChange[] = [];
  let priced = 0;
  let first = true;
  for (let i = 0; i < out.length; i++) {
    const ann = out[i];
    if (!needsReprice(ann, input.playerColor)) continue;
    const fenIndex = (ann.moveNumber - 1) * 2 + (ann.color === 'black' ? 1 : 0);
    const fen = input.fens[fenIndex];
    const best = ann.bestMove;
    if (!fen || !best) continue;
    const playedUci = uciOfSan(fen, ann.san);
    if (!playedUci) continue;
    const before = { classification: ann.classification, cpLoss: twoReadCost(ann) };
    if (playedUci === best) {
      // The stored best move: nothing given up, inside any search.
      ann.costCp = 0;
      priced += 1;
      continue;
    }
    if (!first && input.yieldBetween) await input.yieldBetween();
    first = false;
    // The SETTLED price: a band-edge read deepens before it is stamped, so the
    // stored grade is the one a deeper search would agree with.
    const price = await settledMovePrice({
      fenBefore: fen,
      playedUci,
      fan: { topLines: [{ evaluation: 0, mate: null, moves: [best] }] },
      scorer: input.scorer,
      depth: input.depth,
    }).catch(() => null);
    if (!price?.scores) continue;
    const one = { costCp: price.costCp, bestWhiteCp: price.scores.bestWhiteCp, playedWhiteCp: price.scores.playedWhiteCp };
    priced += 1;
    const isWhite = ann.color === 'white';
    const regraded = classifyCpLoss(one.costCp, one.bestWhiteCp, one.playedWhiteCp, isWhite, ann.san.includes('#'), fen, ann.san);
    // A fault the one search confirms takes its band; one it does not becomes
    // "good". A move that was never a fault keeps its praise (great, best).
    const next: MoveClassification = FAULTS.has(regraded) ? regraded
      : FAULTS.has(ann.classification) ? 'good'
      : ann.classification;
    ann.costCp = one.costCp;
    ann.bestMoveEval = one.bestWhiteCp;
    if (next !== ann.classification) {
      changes.push({ index: i, fenBefore: fen, san: ann.san, before, after: { classification: next, cpLoss: one.costCp } });
      ann.classification = next;
    }
  }
  return { annotations: out, priced, changes };
}
