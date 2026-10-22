/**
 * KING PRESSURE — a boss that comes for the king (the Attacker, Tier 11). Likes
 * a move after which its pieces bear on the squares around the student's king
 * MORE than before (every attacker on every square of the king zone counted,
 * so bringing a second piece to bear on a covered square counts too);
 * dislikes one that pulls pressure away; 0 when the count is unchanged.
 *
 * The king zone is the one computer the coach already names it with
 * (`keySquares.kingZoneSquares`: the up-to-8 squares around the king, never
 * the king's own square — a piece hitting that is giving check). Pure:
 * chess.js, no engine. Inside the window only, so it never attacks below its
 * level.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { registerScorer, type Scorer } from '../moveScoring';
import { kingZoneSquares } from '../../services/keySquares';
import { playCandidate } from './bossShared';

declare module '../moveScoring' {
  interface ScorerIdMap {
    /** Brings more of its pieces to bear around the student's king (the Attacker). */
    kingPressure: true;
  }
}

/** Every attack `by` has on the squares around the other side's king. */
export function kingZoneAttacks(board: Chess, by: Color): number {
  return kingZoneSquares(board, by === 'w' ? 'white' : 'black')
    .reduce((n, sq) => n + board.attackers(sq as Square, by).length, 0);
}

export const kingPressureScorer: Scorer = (candidate, ctx) => {
  const played = playCandidate(ctx.fen, candidate.uci);
  if (!played) return 0;
  return Math.sign(kingZoneAttacks(played.board, ctx.coach) - kingZoneAttacks(new Chess(ctx.fen), ctx.coach));
};

registerScorer('kingPressure', kingPressureScorer);
