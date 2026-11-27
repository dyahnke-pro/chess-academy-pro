/**
 * THE FOCUS'S TRADE PREFERENCE (Coach Build Board "4. Focuses", David
 * 2026-11-24: "Reaching an endgame: same strength, the coach prefers trades
 * while you're well ahead"). In a Learn focus game, once the board is an
 * ending and the student leads by at least `TRADE_LEAD_CP` (a piece), the
 * coach likes an EQUAL trade among the moves its level would play anyway —
 * the student's win is then a matter of technique, the endgame's focus.
 *
 * Same strength: `scoreCandidates` ranks only inside the coach's acceptable
 * window, so this never plays below its level. An equal trade is the trades
 * dial's own reading (`captureNet` = 0); a losing trade scores 0, never a
 * liking. Pure.
 */
import { isEndgameByMaterial } from '../../services/gamePhaseService';
import { registerScorer, type Scorer } from '../moveScoring';
import { captureNet } from './trades';

declare module '../moveScoring' { interface ScorerIdMap { focusTrades: true } }

/** The student's lead, cp, from which the coach prefers trades: a piece. */
export const TRADE_LEAD_CP = 300;

export const focusTradesScorer: Scorer = (candidate, ctx) => {
  if (!ctx.focus || ctx.coachEvalCp === null || ctx.coachEvalCp > -TRADE_LEAD_CP) return 0;
  if (ctx.fen.split(' ')[1] !== ctx.coach || !isEndgameByMaterial(ctx.fen)) return 0;
  return captureNet(ctx.fen, candidate.uci) === 0 ? 1 : 0;
};

registerScorer('focusTrades', focusTradesScorer);
