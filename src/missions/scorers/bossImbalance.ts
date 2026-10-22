/**
 * IMBALANCE — a boss that will not let the position stay level (the Dynamo,
 * Tier 12: imbalances). Reads the capture the candidate makes:
 *
 *   +1 — it trades UNLIKE minor pieces: a bishop takes a knight or a knight
 *        takes a bishop, and the exchange is even (what it takes, minus what
 *        the student wins back by the legal SEE, nets exactly 0). The board
 *        after holds bishop against knight.
 *   −1 — it STARTS a like-for-like even trade: a piece takes a piece of its
 *        own kind (knight for knight, bishop for bishop, rook for rook, queen
 *        for queen) and the exchange nets 0 — the symmetrical simplification
 *        the Dynamo avoids. A recapture is not one: taking back what was just
 *        taken nets the piece, never 0.
 *    0 — everything else: quiet moves, pawn captures, captures that win or
 *        lose material.
 *
 * Pure (chess.js + the legal SEE, `trades.captureNet`). Inside the window
 * only, so the Dynamo never unbalances below its level.
 */
import { registerScorer, type Scorer } from '../moveScoring';
import { captureNet } from './trades';
import { playCandidate } from './bossShared';

declare module '../moveScoring' {
  interface ScorerIdMap {
    /** Trades bishop for knight, avoids even like-for-like trades (the Dynamo). */
    imbalance: true;
  }
}

const MINORS = new Set(['n', 'b']);
const PIECES = new Set(['n', 'b', 'r', 'q']);

export const imbalanceScorer: Scorer = (candidate, ctx) => {
  const played = playCandidate(ctx.fen, candidate.uci);
  const taken = played?.move.captured;
  if (!played || !taken || !PIECES.has(played.move.piece) || !PIECES.has(taken)) return 0;
  if (captureNet(ctx.fen, candidate.uci) !== 0) return 0;
  if (played.move.piece === taken) return -1;
  return MINORS.has(played.move.piece) && MINORS.has(taken) ? 1 : 0;
};

registerScorer('imbalance', imbalanceScorer);
