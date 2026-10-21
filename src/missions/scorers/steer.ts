/**
 * THE STEER SCORER (the card's `steer` dial; WO-CAMPAIGN-MASTER, Lane D).
 *
 * Among the moves the coach would play anyway (`scoreCandidates` only ranks
 * inside the acceptable window), it likes the ones after which the card's
 * pattern is on the board FOR THE STUDENT — the opportunity the card wants
 * the student to meet: +1 when the pattern is present after the coach's
 * candidate, 0 otherwise (and 0 with no pattern). Pure: chess.js and the
 * pattern checks, no engine.
 */
import { registerScorer, type ScoringCandidate, type ScoringContext } from '../moveScoring';
import { patternAfterMove } from '../patterns';

export function steerScore(candidate: ScoringCandidate, ctx: ScoringContext): number {
  if (!ctx.pattern) return 0;
  const student = ctx.coach === 'w' ? 'b' : 'w';
  return patternAfterMove(ctx.pattern, ctx.fen, candidate.uci, student) ? 1 : 0;
}

registerScorer('steer', steerScore);
