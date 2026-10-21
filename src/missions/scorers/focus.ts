/**
 * THE FOCUS SCORER (WO-LEARN-FOCUS-01, `docs/LEARN-FOCUS.md` §7).
 *
 * In a Learn focus game, among the moves the coach would play anyway
 * (`scoreCandidates` only ranks inside the acceptable window, so the coach
 * never plays below its level), it likes a move that POSES the focus's DEFEND
 * seat to the user:
 *   - loose pieces: the move attacks a piece of theirs that can be won;
 *   - tactics: the move sets up a fork, pin, skewer or discovery against them;
 *   - the kings: the move brings pressure on their king (more of the squares
 *     around it attacked, or a mate threat).
 * It never likes a GIFT: a move that leaves a coach piece the user can win
 * scores −1, whatever it poses. Only the defend seat can be created without a
 * gift — the exploit seat arrives from the coach's own level.
 *
 * Pure: chess.js and the app's own computers (the exchange counter, the
 * threat detector), no engine.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { registerScorer, type ScoringCandidate, type ScoringContext } from '../moveScoring';
import { legalSeeGainFor } from '../../services/positionReadingService';
import { newThreatsAtTurn } from '../../services/threatAnswerEvidence';
import { kingZoneSquares } from '../../services/keySquares';
import type { FocusId } from '../../coach/focus/focusCard';

declare module '../moveScoring' { interface ScorerIdMap { focus: true } }

const GIVE = 2;
const PIECES = new Set(['n', 'b', 'r', 'q']);
const TACTIC = new Set(['fork', 'pin', 'skewer', 'discovery', 'double_check']);

function after(fen: string, uci: string): Chess | null {
  try {
    const c = new Chess(fen);
    c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return c;
  } catch { return null; }
}

function winnable(c: Chess, side: Color, by: Color): boolean {
  for (const row of c.board()) for (const cell of row) {
    if (cell && cell.color === side && PIECES.has(cell.type) && legalSeeGainFor(c.fen(), cell.square, by) >= GIVE) return true;
  }
  return false;
}

function zonePressure(c: Chess, coach: Color): number {
  const zone = kingZoneSquares(c, coach === 'w' ? 'white' : 'black');
  return zone.filter((sq) => c.attackers(sq as Square, coach).length > 0).length;
}

/** Does the board after the coach's move pose the focus's defend seat? */
export function posesDefendSeat(focus: FocusId, fen: string, uci: string, coach: Color): boolean {
  const c = after(fen, uci);
  if (!c) return false;
  const user: Color = coach === 'w' ? 'b' : 'w';
  switch (focus) {
    case 'loose-pieces':
      return winnable(c, user, coach) && !winnable(new Chess(fen), user, coach);
    case 'tactics':
      return newThreatsAtTurn(c.fen(), null).some((t) => TACTIC.has(t.pattern));
    case 'kings': {
      if (newThreatsAtTurn(c.fen(), null).some((t) => t.pattern === 'mate_threat' || t.pattern === 'back_rank')) return true;
      const before = new Chess(fen);
      return zonePressure(c, coach) > zonePressure(before, coach);
    }
  }
}

/** A gift: the user can win a coach piece after this move. */
export function isGift(fen: string, uci: string, coach: Color): boolean {
  const c = after(fen, uci);
  if (!c) return true;
  return winnable(c, coach, coach === 'w' ? 'b' : 'w');
}

export function focusScore(candidate: ScoringCandidate, ctx: ScoringContext): number {
  if (!ctx.focus) return 0;
  if (isGift(ctx.fen, candidate.uci, ctx.coach)) return -1;
  return posesDefendSeat(ctx.focus, ctx.fen, candidate.uci, ctx.coach) ? 1 : 0;
}

registerScorer('focus', focusScore);
