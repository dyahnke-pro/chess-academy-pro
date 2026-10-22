/**
 * THE FOCUS SCORER (WO-LEARN-FOCUS-01, `docs/LEARN-FOCUS.md` §7).
 *
 * In a Learn focus game, among the moves the coach would play anyway
 * (`scoreCandidates` only ranks inside the acceptable window, so the coach
 * never plays below its level), it likes a move that POSES the tactics
 * focus's DEFEND seat to the user (WO-FOCUS-TACTICS-01 — "your opponent will
 * also be trying to set up its own tactics"):
 *   - the move attacks a piece of theirs that can now be won (the first rung);
 *   - or it sets up one of the coach's motifs at the student's OPEN levels (a
 *     fork, pin, skewer, discovery or a mate threat at Beginner) against them.
 * It never likes a GIFT: a move that leaves a coach piece the user can win
 * scores −1, whatever it poses. Only the defend seat can be created without a
 * gift — the exploit seat arrives from the coach's own level.
 *
 * Pure: chess.js and the app's own computers (the exchange counter, the
 * threat detector), no engine.
 */
import { Chess, type Color } from 'chess.js';
import { registerScorer, type ScoringCandidate, type ScoringContext } from '../moveScoring';
import { legalSeeGainFor } from '../../services/positionReadingService';
import { MATERIAL_VALUE } from '../../services/pieceValues';
import type { FocusId } from '../../coach/focus/focusCard';
import { motifPatterns, posedMotifs } from '../../coach/focus/focusChances';
import type { MotifLevel } from '../../data/tacticMotifs';

declare module '../moveScoring' { interface ScorerIdMap { focus: true } }

const GIVE = 2;
const PIECES = new Set(['n', 'b', 'r', 'q']);

function after(fen: string, uci: string): Chess | null {
  try {
    const c = new Chess(fen);
    c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return c;
  } catch { return null; }
}

/** Can `by` win material off `side`, net of `credit` (what the last move
 *  itself took — a recapture after an even trade is not a win). */
function winnable(c: Chess, side: Color, by: Color, credit = 0): boolean {
  for (const row of c.board()) for (const cell of row) {
    if (cell && cell.color === side && PIECES.has(cell.type) && legalSeeGainFor(c.fen(), cell.square, by) - credit >= GIVE) return true;
  }
  return false;
}

/** Does the board after the coach's move pose the focus's defend seat, at
 *  the student's open motif levels (a locked motif is never steered toward:
 *  the lesson would not ask about it)? */
export function posesDefendSeat(focus: FocusId, fen: string, uci: string, coach: Color, open: ReadonlySet<MotifLevel>): boolean {
  const c = after(fen, uci);
  if (!c) return false;
  const user: Color = coach === 'w' ? 'b' : 'w';
  // One focus, one defend seat: a `Record` over `FocusId` would answer the
  // same for every member until a second focus is built.
  const seat: Record<FocusId, () => boolean> = {
    // The SAME reading of "a question" the focus asks by (`posedMotifs`): a
    // steer toward a motif that wins nothing teaches nothing.
    tactics: () => (winnable(c, user, coach) && !winnable(new Chess(fen), user, coach))
      || posedMotifs(c.fen(), null, motifPatterns(open)).length > 0,
  };
  return seat[focus]();
}

/** A gift: the user can win a coach piece after this move, NET of what the
 *  move itself took — an even trade is not a gift (the same rule the focus's
 *  save and deciding checks count by). */
export function isGift(fen: string, uci: string, coach: Color): boolean {
  const c = after(fen, uci);
  if (!c) return true;
  const took = c.history({ verbose: true }).at(-1)?.captured;
  return winnable(c, coach, coach === 'w' ? 'b' : 'w', took ? MATERIAL_VALUE[took] : 0);
}

export function focusScore(candidate: ScoringCandidate, ctx: ScoringContext): number {
  if (!ctx.focus) return 0;
  if (isGift(ctx.fen, candidate.uci, ctx.coach)) return -1;
  return posesDefendSeat(ctx.focus.id, ctx.fen, candidate.uci, ctx.coach, ctx.focus.levels) ? 1 : 0;
}

registerScorer('focus', focusScore);
