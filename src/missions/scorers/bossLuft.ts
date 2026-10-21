/**
 * LUFT — a pawn move that gives a CASTLED king (on its back rank, on a wing:
 * a/b/c or g/h) an escape square. A boss that neglects its back rank (the
 * Grabber) carries a NEGATIVE weight here, so it avoids making luft and leaves
 * the back-rank mate on. A king still in the middle has no luft to make: an
 * opening pawn move beside it is development, not luft (gate 1: …e5 at move
 * one read as luft and the boss swapped it out).
 */
import { registerScorer } from '../moveScoring';
import { playCandidate } from './bossShared';

declare module '../moveScoring' {
  interface ScorerIdMap {
    /** Makes luft for a king on its back rank (the Grabber avoids it). */
    luft: true;
  }
}

const FILES = 'abcdefgh';

registerScorer('luft', (candidate, ctx) => {
  const played = playCandidate(ctx.fen, candidate.uci);
  if (!played || played.move.piece !== 'p') return 0;
  const back = ctx.coach === 'w' ? '1' : '8';
  const home = ctx.coach === 'w' ? '2' : '7';
  const king = played.board.board().flat().find((p) => p?.type === 'k' && p.color === ctx.coach);
  if (!king || king.square[1] !== back || played.move.from[1] !== home || !'abcgh'.includes(king.square[0])) return 0;
  return Math.abs(FILES.indexOf(played.move.from[0]) - FILES.indexOf(king.square[0])) <= 1 ? 1 : 0;
});
