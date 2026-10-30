// planStep — A MOVE AS A STEP OF ITS SIDE'S PLAN (David 2026-10-15: credit the
// moves that carry a plan out, so the student learns what working a plan looks
// like). Read off the board before and after the move; said by the plan thread
// on Learn and Review alike — for the student's move against the plan they
// heard, and for THEIR move against their plan (WO-DECIDER-02: what the other
// side is working toward is half of reading a game, and the same computer
// reads both seats).
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

interface PlanStep { text: string; squares: string[] }

export function planStepLine(
  plan: PlanFact, fenBefore: string, san: string, mover: Color,
  /** REQUIRED — whose move it is, seat-relative to the student. */
  seat: 'you' | 'them',
  /** REQUIRED — the board the line is SAID on. The student's step is credited
   *  after their reply (Review prod audit 2026-10-30, Carlsen–Grischuk 32.Qc3:
   *  "one more piece on their weak pawn on c5" was said after 32…c4 had moved
   *  the pawn): the credit holds only while this board still shows it. */
  fenNow: string,
): PlanStep | null {
  let before: Chess; let after: Chess; let now: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); now = new Chess(fenNow); } catch { return null; }
  if (before.turn() !== mover) return null;
  let mv;
  try { mv = after.move(san); } catch { return null; }
  if (!mv) return null;
  const student = mover;
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  // The words for each seat: the mover's side, the other side, and the plan.
  const W = seat === 'you'
    ? { Own: 'Your', other: 'their', of: 'the plan', at: 'the plan at work', hit: 'you hit', guard: 'they guard', yourExtra: 'while you are ahead', yourBishops: 'your two bishops' }
    : { Own: 'Their', other: 'your', of: 'their plan', at: 'their plan at work', hit: 'they hit', guard: 'you guard', yourExtra: 'while they are ahead', yourBishops: 'their two bishops' };
  // A STEP THAT DROPS THE PIECE IS NOT A STEP (test 2026-10-15: Bc4 "added a
  // piece against the weak pawn on d5" — and the d5 pawn takes it). Credit only
  // a move whose piece they cannot win.
  try { if (legalSeeGainFor(after.fen(), mv.to, enemy) > 0) return null; } catch { return null; }
  const noun = PIECE_NOUN[mv.piece] ?? 'piece';
  // The piece that made the step is still where it went — taken or moved on,
  // its step no longer stands on the board the line is said on.
  const stays = now.get(mv.to);
  if (!stays || stays.color !== mover || stays.type !== mv.piece) return null;
  switch (plan.kind) {
    case 'weak-pawn': {
      const weak = plan.squares[0] as Square;
      const block = plan.squares[1];
      const target = now.get(weak);
      if (!target || target.color !== enemy || target.type !== 'p') return null;
      if (mv.to === block && mv.piece !== 'p') {
        return { text: `${W.Own} ${noun} to ${mv.to} was a step of ${W.of}: it sits in front of ${W.other} weak pawn on ${weak}, so the pawn can never advance.`, squares: [mv.to, weak] };
      }
      const hitBefore = before.attackers(weak, student).length;
      const hitAfter = after.attackers(weak, student).length;
      if (hitAfter > hitBefore && now.attackers(weak, student).includes(mv.to)) {
        return { text: `${W.Own} ${noun} to ${mv.to} was a step of ${W.of}: one more piece on ${W.other} weak pawn on ${weak} — ${W.hit} it ${times(now.attackers(weak, student).length)}, ${W.guard} it ${times(now.attackers(weak, enemy).length)}.`, squares: [mv.to, weak] };
      }
      return null;
    }
    case 'worst-piece': {
      if (mv.from !== plan.squares[0]) return null;
      const was = mobilityMap(before, student).get(mv.from) ?? 0;
      const reach = mobilityMap(now, student).get(mv.to) ?? 0;
      if (reach <= was + 1) return null;
      return { text: `${W.Own} ${noun} to ${mv.to} was ${W.at}: the piece that was doing nothing now reaches ${reach} squares instead of ${was}.`, squares: [mv.from, mv.to] };
    }
    case 'convert': {
      if (!mv.captured || mv.captured === 'p') return null;
      return { text: `Taking on ${mv.to} was ${W.at}: ${W.yourExtra}, every piece that comes off makes the extra material count for more.`, squares: [mv.to] };
    }
    case 'bishop-pair': {
      if (mv.piece !== 'p' || mv.captured !== 'p') return null;
      return { text: `That pawn trade on ${mv.to} was ${W.at}: every pawn that comes off opens the board for ${W.yourBishops}.`, squares: [mv.to] };
    }
    default:
      return null;
  }
}
