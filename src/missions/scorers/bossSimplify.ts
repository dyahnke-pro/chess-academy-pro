/**
 * SIMPLIFY — a boss that grinds a lead down (the Grinder, Tier 13: squeeze &
 * resilience). The twin of the `trades` scorer, read from the other side of
 * the eval:
 *
 *   +1 — the coach stands at least a pawn up (`coachEvalCp ≥ AHEAD_CP`), and
 *        the candidate is a capture of a PIECE (knight, bishop, rook, queen)
 *        whose exchange nets the coach exactly 0 (what it takes, minus what
 *        the student wins back by the legal SEE): an even trade of pieces,
 *        the side ahead taking the defender's pieces off.
 *    0 — everything else: no read of the standing, the coach not a pawn up,
 *        quiet moves, pawn-for-pawn trades (the side ahead keeps its pawns),
 *        captures that win or lose material.
 *
 * Its other half — keeping pieces on when BEHIND — is the existing `trades`
 * scorer at a negative weight (the Grinder's preset), never a second copy.
 * Pure (chess.js + the legal SEE). Inside the window only.
 */
import { registerScorer, type Scorer } from '../moveScoring';
import { captureNet } from './trades';
import { playCandidate } from './bossShared';

declare module '../moveScoring' {
  interface ScorerIdMap {
    /** Even trades of pieces while a pawn or more up (the Grinder). */
    simplify: true;
  }
}

/** The lead, in the coach's centipawns, at which it starts trading down. */
export const AHEAD_CP = 100;

const PIECES = new Set(['n', 'b', 'r', 'q']);

export const simplifyScorer: Scorer = (candidate, ctx) => {
  if (ctx.coachEvalCp === null || ctx.coachEvalCp < AHEAD_CP) return 0;
  if (ctx.fen.split(' ')[1] !== ctx.coach) return 0;
  const taken = playCandidate(ctx.fen, candidate.uci)?.move.captured;
  if (!taken || !PIECES.has(taken)) return 0;
  return captureNet(ctx.fen, candidate.uci) === 0 ? 1 : 0;
};

registerScorer('simplify', simplifyScorer);
