/**
 * TARGETS — a boss going after the student's weak spots (docs/CAMPAIGN.md §7).
 * Likes a move after which one of the patterns of the student's weakest taught
 * habits (`weakness.ts`, handed in as `ctx.targets`) is on the board for the
 * student — the chance their record says they miss.
 */
import { registerScorer } from '../moveScoring';
import { playCandidate } from './bossShared';

declare module '../moveScoring' {
  interface ScorerIdMap {
    /** Steers toward the student's weakest habits' patterns (every boss). */
    targets: true;
  }
}

registerScorer('targets', (candidate, ctx) => {
  if (ctx.targets.length === 0) return 0;
  const played = playCandidate(ctx.fen, candidate.uci);
  if (!played) return 0;
  const fen = played.board.fen();
  const student = ctx.coach === 'w' ? 'b' : 'w';
  return ctx.targets.some((t) => t.present(fen, student)) ? 1 : 0;
});
