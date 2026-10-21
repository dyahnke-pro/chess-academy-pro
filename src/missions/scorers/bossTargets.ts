/**
 * TARGETS — a boss going after the student's weak spots (docs/CAMPAIGN.md §7).
 * Likes a move after which one of the patterns of the student's weakest taught
 * habits (`weakness.ts`, handed in as `ctx.targets`) is on the board for the
 * student — the chance their record says they miss. Read through the pattern
 * library's move-aware check (`patternAfterMove`): a piece the coach just took
 * with is not a free piece when it is taken back.
 */
import { registerScorer } from '../moveScoring';
import { patternAfterMove } from '../patterns';

declare module '../moveScoring' {
  interface ScorerIdMap {
    /** Steers toward the student's weakest habits' patterns (every boss). */
    targets: true;
  }
}

registerScorer('targets', (candidate, ctx) => {
  const student = ctx.coach === 'w' ? 'b' : 'w';
  return ctx.targets.some((id) => patternAfterMove(id, ctx.fen, candidate.uci, student)) ? 1 : 0;
});
