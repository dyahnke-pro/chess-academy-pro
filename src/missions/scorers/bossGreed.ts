/**
 * GREED — a boss that grabs (the Grabber). Likes a capture: a pawn most of
 * all (it cannot resist one), any other capture half as much. Inside the
 * window only, so it never grabs below its level.
 */
import { registerScorer } from '../moveScoring';
import { playCandidate } from './bossShared';

declare module '../moveScoring' {
  interface ScorerIdMap {
    /** Captures, pawns first (the Grabber). */
    greed: true;
  }
}

registerScorer('greed', (candidate, ctx) => {
  const played = playCandidate(ctx.fen, candidate.uci);
  if (!played?.move.captured) return 0;
  return played.move.captured === 'p' ? 1 : 0.5;
});
