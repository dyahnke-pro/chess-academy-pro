/**
 * THE TRADES SCORER — the `trades` dial (WO-CAMPAIGN-MASTER Lane A).
 *
 * A card that wants the game to reach its ending sooner sets `trades: 'eager'`
 * (weight +1); one that wants pieces kept on sets `'reluctant'` (weight −1).
 * Either way the scorer says the same thing: how much it likes a candidate AS
 * AN EQUAL TRADE while the coach is behind — the student ahead and the coach
 * simplifying into the ending the student should win.
 *
 *   +1 — the candidate is a capture whose exchange nets the coach exactly 0
 *        (what it takes, minus what the student wins back by the legal SEE),
 *        and the coach stands worse (`coachEvalCp < 0`).
 *    0 — everything else: no read of the standing, the coach level or ahead,
 *        a quiet move, a capture that wins material, and a LOSING trade. A
 *        losing trade scores 0, never below: under the `reluctant` weight a
 *        negative score would turn into a liking, and the coach would start
 *        giving material away to avoid trades.
 *
 * Pure (chess.js + the legal SEE). `scoreCandidates` only ever offers it
 * moves inside the coach's acceptable window.
 */
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import { registerScorer, type Scorer } from '../moveScoring';

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** What the coach nets by the capture `uci` on `fen` (coach to move) once the
 *  student answers it by the legal SEE — or null when it is not a legal
 *  capture by the side to move. */
export function captureNet(fen: string, uci: string): number | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  let move;
  try { move = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return null; }
  if (!move.captured) return null;
  const won = VALUE[move.captured] + (move.promotion ? VALUE[move.promotion] - VALUE.p : 0);
  const wonBack = legalSeeGainFor(board.fen(), move.to as Square, board.turn());
  return won - wonBack;
}

export const tradesScorer: Scorer = (candidate, ctx) => {
  if (ctx.coachEvalCp === null || ctx.coachEvalCp >= 0) return 0;
  if (ctx.fen.split(' ')[1] !== ctx.coach) return 0;
  return captureNet(ctx.fen, candidate.uci) === 0 ? 1 : 0;
};

registerScorer('trades', tradesScorer);
