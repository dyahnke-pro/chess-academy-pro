// planStep — THE STUDENT'S MOVE AS A STEP OF THE PLAN THEY HEARD (David
// 2026-10-15: credit the moves that carry a plan out, so the student learns
// what working a plan looks like). Read off the board before and after their
// move; said by the plan thread on Learn and Review alike.
//
// Only the plan kinds the plan ARC does not follow: the arc already counts the
// steps toward an outpost, a file, a passer, a route and the king, and a second
// voice for one step would say it twice.
import { Chess, type Color, type Square } from 'chess.js';
import type { PlanFact } from './nextPlans';
import { mobilityMap, PIECE_NOUN } from './nextPlans';
import { legalSeeGainFor } from './positionReadingService';

const TIMES = ['no times', 'once', 'twice', 'three times', 'four times'];
const times = (n: number): string => TIMES[n] ?? `${n} times`;

export interface PlanStep { text: string; squares: string[] }

export function planStepLine(plan: PlanFact, fenBefore: string, san: string, student: Color): PlanStep | null {
  let before: Chess; let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); } catch { return null; }
  if (before.turn() !== student) return null;
  let mv;
  try { mv = after.move(san); } catch { return null; }
  if (!mv) return null;
  const enemy: Color = student === 'w' ? 'b' : 'w';
  // A STEP THAT DROPS THE PIECE IS NOT A STEP (test 2026-10-15: Bc4 "added a
  // piece against the weak pawn on d5" — and the d5 pawn takes it). Credit only
  // a move whose piece they cannot win.
  try { if (legalSeeGainFor(after.fen(), mv.to, enemy) > 0) return null; } catch { return null; }
  const noun = PIECE_NOUN[mv.piece] ?? 'piece';
  switch (plan.kind) {
    case 'weak-pawn': {
      const weak = plan.squares[0] as Square;
      const block = plan.squares[1];
      const target = after.get(weak);
      if (!target || target.color !== enemy) return null;
      if (mv.to === block && mv.piece !== 'p') {
        return { text: `Your ${noun} to ${mv.to} was a step of the plan: it sits in front of their weak pawn on ${weak}, so the pawn can never advance.`, squares: [mv.to, weak] };
      }
      const hitBefore = before.attackers(weak, student).length;
      const hitAfter = after.attackers(weak, student).length;
      if (hitAfter > hitBefore && after.attackers(weak, student).includes(mv.to)) {
        return { text: `Your ${noun} to ${mv.to} was a step of the plan: one more piece on their weak pawn on ${weak} — you hit it ${times(hitAfter)}, they guard it ${times(after.attackers(weak, enemy).length)}.`, squares: [mv.to, weak] };
      }
      return null;
    }
    case 'worst-piece': {
      if (mv.from !== plan.squares[0]) return null;
      const was = mobilityMap(before, student).get(mv.from) ?? 0;
      const now = mobilityMap(after, student).get(mv.to) ?? 0;
      if (now <= was + 1) return null;
      return { text: `Your ${noun} to ${mv.to} was the plan at work: the piece that was doing nothing now reaches ${now} squares instead of ${was}.`, squares: [mv.from, mv.to] };
    }
    case 'convert': {
      if (!mv.captured || mv.captured === 'p') return null;
      return { text: `Taking on ${mv.to} was the plan at work: while you are ahead, every piece that comes off makes the extra material count for more.`, squares: [mv.to] };
    }
    case 'bishop-pair': {
      if (mv.piece !== 'p' || mv.captured !== 'p') return null;
      return { text: `That pawn trade on ${mv.to} was the plan at work: every pawn that comes off opens the board for your two bishops.`, squares: [mv.to] };
    }
    default:
      return null;
  }
}
