/**
 * LOOSE — a boss that leaves its own pieces undefended (the Grabber). Likes a
 * move after which more of its knights, bishops, rooks and queen stand with no
 * defender than before; dislikes one that tidies them up.
 */
import { Chess, type Color } from 'chess.js';
import { registerScorer } from '../moveScoring';
import { playCandidate } from './bossShared';

declare module '../moveScoring' {
  interface ScorerIdMap {
    /** Leaves its own pieces undefended (the Grabber). */
    loose: true;
  }
}

/** The side's pieces (not pawns, not the king) no friendly piece defends. */
function loosePieces(board: Chess, side: Color): number {
  let n = 0;
  for (const row of board.board()) {
    for (const p of row) {
      if (!p || p.color !== side || p.type === 'p' || p.type === 'k') continue;
      if (!board.isAttacked(p.square, side)) n += 1;
    }
  }
  return n;
}

registerScorer('loose', (candidate, ctx) => {
  const played = playCandidate(ctx.fen, candidate.uci);
  if (!played) return 0;
  return Math.sign(loosePieces(played.board, ctx.coach) - loosePieces(new Chess(ctx.fen), ctx.coach));
});
