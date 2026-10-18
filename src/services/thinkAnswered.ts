/**
 * thinkAnswered — did the student's move answer the question the coach asked
 * before it? (David 2026-10-18: "Or after the move if it was wrong.")
 *
 * The question's check (`ThinkCheck`, carried on the line by `thinkLine`) says
 * what an answering move looks like. Right → a short credit that names what
 * the move did. Wrong, or a question with no single right move → null, and
 * the full answer is said.
 *
 * FALSE CREDIT IS WORSE THAN A REPEATED ANSWER: telling a student they met a
 * threat they walked into teaches the opposite of the lesson. So every check
 * is read conservatively, and the credit never restates the answer's move —
 * the student may have answered it with a different one.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { standsSafe } from './positionReadingService';
import type { ThinkCheck } from '../utils/thinkPause';

export interface StudentMove {
  from: string;
  to: string;
  /** The board after the student's move. */
  fenAfter: string;
}

/** The credit for a move that answered the question, or null. */
export function thinkCredit(check: ThinkCheck, move: StudentMove): string | null {
  let after: Chess;
  try { after = new Chess(move.fenAfter); } catch { return null; }
  const uci = `${move.from}${move.to}`;
  switch (check.kind) {
    case 'always':
      return null;
    case 'avoid':
      return check.uci.includes(uci) ? null : 'You stayed away from it — that one gets refuted.';
    case 'from':
      return move.from === check.square
        ? `Right piece — the one on ${check.square} was doing the least.`
        : null;
    case 'hit': {
      const target = check.square as Square;
      const moved = after.get(move.to as Square);
      if (!moved) return null;
      // A piece sent to attack it must not simply hang there.
      const hits = move.to === check.square
        || (after.attackers(target, moved.color).includes(move.to as Square)
          && standsSafe(move.fenAfter, move.to as Square, after.turn()));
      return hits ? `Right target — you went after ${check.square}.` : null;
    }
    case 'parry': {
      if (uci === check.best) return 'Threat met — that was the move.';
      const foe: Color = after.turn();
      const safe = check.squares.every((sq) => {
        const at = (sq === move.from ? move.to : sq) as Square;
        const p = after.get(at);
        if (!p || p.color === foe) return false;
        return p.type === 'k' || standsSafe(move.fenAfter, at, foe);
      });
      return check.squares.length > 0 && safe ? 'Threat met — nothing there can be won now.' : null;
    }
  }
}
