// WHAT A CHECK LEAVES THEM — the consequence a check carries, read off the
// board after it (Danya have-check 2026-11-19: "it gives check" / "checks the
// king, forcing a reply" was said on 23 boards, true of every check and
// teaching nothing). One or two answers are named; a king with no block or
// capture "has to move"; anything wider is no consequence (null), and the
// check alone is the move read back.
import { Chess } from 'chess.js';

/** `answerer`: the possessive of the side in check, from the student's seat
 *  ('their' when the student checks, 'your' when they do). */
export function checkAnswers(fenAfter: string, answerer: 'their' | 'your'): string | null {
  let all; let checkers: string[] = [];
  try {
    const c = new Chess(fenAfter);
    all = c.moves({ verbose: true });
    const king = c.findPiece({ type: 'k', color: c.turn() })[0];
    checkers = king ? c.attackers(king, c.turn() === 'w' ? 'b' : 'w') : [];
  } catch { return null; }
  // A check that can be taken is a SACRIFICE: what the capture leads to is
  // the sacrifice's own line ("After …Kxf7, you play Qxd8"), so naming the
  // answers would only restate it (composerSaysOnce, Bxf7+).
  if (all.some((m) => checkers.includes(m.to))) return null;
  if (all.length === 1) return `${answerer} only answer is ${all[0].san}`;
  if (all.length === 2) return `${answerer === 'their' ? 'they' : 'you'} can answer only with ${all[0].san} or ${all[1].san}`;
  if (all.length > 0 && all.every((m) => m.piece === 'k')) return `${answerer} king has to move`;
  return null;
}
