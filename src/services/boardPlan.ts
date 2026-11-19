// boardPlan — THE PLAN ON A BOARD, read the way Danya reads it (David
// 2026-11-18: "can we strengthen any, like our plan computer"). His plans are
// built on a target: "the isolated d-pawn is a shackling liability … doubling
// rooks is always a good way to begin … bring out the Gun … with Black tied
// down, launch a decisive operation on the kingside". Three readings, each
// from an existing computer, said only when the board or the engine's own
// line proves it:
//
//   siege    — the engine's line brings heavy pieces against the target on
//              its file (`targetSelector.pressureOf`): doubled, tripled, the
//              gun;
//   steps    — the mover's next quiet moves in an engine line and what they
//              aim at (`planSteps`), a plain trade in the line allowed;
//   switch   — the target holds (its guards match every piece that can come)
//              and it ties pieces of theirs down: open play on the other wing,
//              by a pawn break the board has there.
//
// PURE: chess.js, the board readers and the lines handed in. Dual use: the
// same plan a read teaches is the plan a student's game can be checked against.
import { findPawnBreaks } from './positionReadingService';
import { Chess, type Color } from 'chess.js';
import { opponentTargets, pressureOf, pressureLine, type Target } from './targetSelector';
import { planSteps, planStepsText } from './planSteps';
import { isPawnBreak } from './pawnBreak';
import { wingPawns, type Wing } from './boardStructure';

export interface BoardPlanLine { text: string; squares: string[] }

/** One engine line from the board: the mover's move first (UCI). */
export interface PlanLine { moves: readonly string[] }

const WING_OF = (sq: string): Wing => (sq.charCodeAt(0) - 97 <= 3 ? 'queenside' : 'kingside');
const OTHER: Record<Wing, Wing> = { queenside: 'kingside', kingside: 'queenside' };

function sanOf(fen: string, uci: string): string | null {
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
}

/** THE SIEGE the engine's BEST line builds on the target's file — never a
 *  weaker line's (the same rule as `stepsOf`). */
export function siegeOf(fen: string, lines: readonly PlanLine[], whose: 'your' | 'their'): BoardPlanLine | null {
  for (const l of lines.slice(0, 1)) {
    const first = l.moves[0];
    const san = first ? sanOf(fen, first) : null;
    if (!san) continue;
    const p = pressureOf(fen, san, l.moves.slice(1));
    if (p && p.form) return { text: pressureLine(p, fen, whose), squares: [p.target, ...p.stack] };
  }
  return null;
}

/** THE QUIET STEPS of the engine's BEST line (a plain trade in it allowed).
 *  Only the best line: a plan read off the second or third line is the slow
 *  move the engine ranked below the point of the position (Danya, the Greek
 *  gift lives on #0: "a4, Ba3 and then the c4 break" from a +2.10 line while
 *  Bxh7+ is +4.14). When the best line is a tactic, the plan is silent and the
 *  tactic computers speak. */
export function stepsOf(fen: string, lines: readonly PlanLine[], whose: 'your' | 'their'): BoardPlanLine | null {
  for (const l of lines.slice(0, 1)) {
    const first = l.moves[0];
    if (!first) continue;
    let after: string;
    try { const c = new Chess(fen); c.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first[4] }); after = c.fen(); } catch { continue; }
    const p = planSteps(after, l.moves.slice(1), first, 3, true, true);
    if (p) return { text: planStepsText(p, whose), squares: p.squares };
  }
  return null;
}

/** The board's main target of theirs, when it holds: every piece of the
 *  mover's that hits it or can come is matched by a guard, and the guards are
 *  pieces (a target has no pawn guard), so they are tied to it. */
function heldTarget(fen: string, me: Color): Target | null {
  const t = opponentTargets(fen, me)[0];
  if (!t || t.guards.length === 0) return null;
  return t.attackers.length + t.reachers.length <= t.guards.length ? t : null;
}

/** THE SECOND FRONT: the target holds and ties their pieces down, so the play
 *  goes to the other wing — said only with a pawn break the board has there
 *  for the mover. */
export function switchWing(fen: string, me: Color, whose: 'your' | 'their'): BoardPlanLine | null {
  const t = heldTarget(fen, me);
  if (!t) return null;
  const board = new Chess(fen);
  if (board.turn() !== me) return null;
  const wing = OTHER[WING_OF(t.square)];
  const mine = new Set(wingPawns(board)[me][wing]);
  // A break that just drops the pawn opens no front (Danya, the hardest move
  // to make #1: "the queenside is permanently locked" — b5 is met by axb5 and
  // loses a pawn): only a break the one break computer accepts.
  const safe = new Set<string>(findPawnBreaks(fen));
  const brk = board.moves({ verbose: true }).find((m) => m.piece === 'p' && mine.has(m.from) && !m.captured && safe.has(m.to) && isPawnBreak(fen, m.san, null));
  if (!brk) return null;
  const other = whose === 'your' ? 'their' : 'your';
  const tied = t.guards.length === 1 ? 'a piece' : `${t.guards.length} pieces`;
  return {
    text: `${other === 'their' ? 'Their' : 'Your'} pawn on ${t.square} holds, but it ties down ${tied} to guard it. That is the time to open a second front on the ${wing}: the ${brk.san} break.`,
    squares: [t.square, ...t.guards, brk.to],
  };
}
