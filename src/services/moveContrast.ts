// moveContrast — "the f-rook, not the a-rook: a8 stays home to guard a7"
// (WO-LAYERS-01 step 6).
//
// Between two good moves a strong coach does not rank them, he names the ONE
// thing that separates them — usually what one of them gives up. The board says
// that without an engine: which of the mover's pieces each move leaves with no
// defender. When exactly one of the two loosens something, that IS the
// difference, and it is board-true (chess.js).
//
// Plan-layer teaching: the door orders it after safety and principle, and a
// student who has proven the plan layer does not hear it.
import { Chess } from 'chess.js';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** The mover's pieces (not the king) with no defender after `san`. */
function looseAfter(fenBefore: string, san: string): Map<string, string> | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  let mv;
  try { mv = c.move(san); } catch { return null; }
  if (!mv) return null;
  const me = mv.color;
  const out = new Map<string, string>();
  for (const row of c.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== me || cell.type === 'k') continue;
      if (c.attackers(cell.square, me).length === 0) out.set(cell.square, cell.type);
    }
  }
  return out;
}

export interface MoveContrast {
  /** The move that keeps the piece defended. */
  keeps: string;
  /** The move that leaves it without a defender. */
  drops: string;
  piece: string;
  square: string;
}

/**
 * The one board-true difference between two moves from the same position:
 * a piece one of them leaves undefended and the other does not. Null when both
 * (or neither) loosen something — no single difference to name.
 */
export function contrastMoves(fenBefore: string, sanA: string, sanB: string): MoveContrast | null {
  const a = looseAfter(fenBefore, sanA);
  const b = looseAfter(fenBefore, sanB);
  if (!a || !b) return null;
  const onlyA = [...a.entries()].filter(([sq]) => !b.has(sq));
  const onlyB = [...b.entries()].filter(([sq]) => !a.has(sq));
  if (onlyA.length > 0 && onlyB.length === 0) return { keeps: sanB, drops: sanA, piece: onlyA[0][1], square: onlyA[0][0] };
  if (onlyB.length > 0 && onlyA.length === 0) return { keeps: sanA, drops: sanB, piece: onlyB[0][1], square: onlyB[0][0] };
  return null;
}

/** Spoken from the student's seat. */
export function contrastClause(c: MoveContrast): string {
  return `${c.keeps} rather than ${c.drops} — ${c.keeps} keeps your ${NAME[c.piece] ?? 'piece'} on ${c.square} defended, and ${c.drops} leaves it with no guard`;
}
