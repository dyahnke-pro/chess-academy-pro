// THE FREE BOARD'S GRADE IS THE ONE PRICE (Review, 2026-10-20). An explored
// move was graded by subtracting two separate time-boxed reads (the position
// before, the position after) — the disease `liveMovePrice` cured on Learn:
// under a busy engine the after-read stops short and the "cost" is whatever
// depth each read happened to reach. Now the explored move is priced the way
// every live move is: best and played scored in ONE search, settled, memoized
// on the same key, and the walk's grade reads that search's two scores.
import { Chess } from 'chess.js';
import type { MoveClassification, StockfishAnalysis } from '../types';
import { classifyCpLoss } from './gameAnalysisService';
import { liveMovePrice } from './playedMoveGrade';

export interface ExploredMoveGrade {
  classification: MoveClassification;
  /** The cost against the best move, mover's seat, from the one search. */
  costCp: number;
  /** White-POV scores from that search — the walk's before / after evals. */
  bestWhiteCp: number;
  playedWhiteCp: number;
  /** The engine's better move, when the explored move was not it. */
  bestUci: string | null;
}

/** Grade an explored move from the one price. Null when it cannot be priced
 *  (no fan, a mate either way, the engine failed): an unpriced move is
 *  narrated ungraded, never graded off two reads. */
export async function gradeExploredMove(input: {
  fenBefore: string;
  san: string;
  /** The read at `fenBefore` — its best line names the best move. */
  before: StockfishAnalysis;
  depth: number;
}): Promise<ExploredMoveGrade | null> {
  let playedUci: string;
  let moverIsWhite: boolean;
  try {
    const c = new Chess(input.fenBefore);
    moverIsWhite = c.turn() === 'w';
    const m = c.move(input.san);
    playedUci = `${m.from}${m.to}${m.promotion ?? ''}`;
  } catch { return null; }
  const price = await liveMovePrice(input.fenBefore, playedUci, input.before, input.depth);
  if (!price) return null;
  const best = input.before.topLines?.[0];
  const bestWhiteCp = price.scores?.bestWhiteCp ?? (best && best.mate == null ? best.evaluation : null);
  if (bestWhiteCp == null) return null;
  const playedWhiteCp = price.scores?.playedWhiteCp ?? bestWhiteCp;
  const bestUci = price.costCp > 0 ? (best?.moves[0] ?? input.before.bestMove ?? null) : null;
  return {
    classification: classifyCpLoss(price.costCp, bestWhiteCp, playedWhiteCp, moverIsWhite, input.san.includes('#'), input.fenBefore, input.san),
    costCp: price.costCp,
    bestWhiteCp,
    playedWhiteCp,
    bestUci: bestUci && bestUci !== playedUci ? bestUci : null,
  };
}
