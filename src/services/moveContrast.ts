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
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { Chess, type Color, type Square } from 'chess.js';
import { pieceRef } from './pieceRef';
import { findLoosePieces } from './loosePieces';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

/** Some enemy piece (side to move in `c`) has a legal move after which it
 *  attacks `sq` — or attacks it already. */
function reachableNextMove(c: Chess, sq: string): boolean {
  const them = c.turn();
  if (c.attackers(sq as Square, them).length > 0) return true;
  for (const m of c.moves({ verbose: true })) {
    if (m.to === sq) return true;
    const d = new Chess(c.fen());
    try { d.move(m); } catch { continue; }
    if (d.attackers(sq as Square, them).length > 0) return true;
  }
  return false;
}

/** The mover's pieces (not the king) with no defender after `san`. */
function looseAfter(fenBefore: string, san: string): Map<string, string> | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  let mv;
  try { mv = c.move(san); } catch { return null; }
  if (!mv) return null;
  const out = new Map<string, string>();
  for (const p of findLoosePieces(c, mv.color)) {
    // A loose PAWN is a lasting target. A loose PIECE is a difference only
    // when they could hit it next move — a bishop at home on c1 that nothing
    // can reach is no reason to prefer one move (review walk 2026-10-01:
    // "h4 keeps your bishop on c1 defended, and Qb3 leaves it with no guard").
    if (p.type !== 'p' && !reachableNextMove(c, p.square)) continue;
    out.set(p.square, p.type);
  }
  return out;
}

interface MoveContrast {
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
  // A SQUARE ONE OF THE MOVES LANDS ON holds a different piece on each board:
  // "h4 keeps your knight on h5 defended, and Nh5 leaves it with no guard" said
  // of a knight that h4 never puts on h5 (decision baseline 2026-11-12). The
  // difference is a piece that stands on both boards.
  // …AND A SQUARE ONE OF THE MOVES LEAVES: "Here Rc7 keeps your rook
  // defended" of the rook Rc7 itself moved off c8 (Danya -Am8 29.Nxd7). Only a
  // square that holds the same piece on both boards is compared.
  const after = (san: string): Chess | null => { try { const c = new Chess(fenBefore); c.move(san); return c; } catch { return null; } };
  const boardA = after(sanA);
  const boardB = after(sanB);
  if (!boardA || !boardB) return null;
  const same = (sq: string): boolean => {
    const x = boardA.get(sq as Square);
    const y = boardB.get(sq as Square);
    return !!x && !!y && x.type === y.type && x.color === y.color;
  };
  const onlyA = [...a.entries()].filter(([sq]) => !b.has(sq) && same(sq));
  const onlyB = [...b.entries()].filter(([sq]) => !a.has(sq) && same(sq));
  if (onlyA.length > 0 && onlyB.length === 0) return { keeps: sanB, drops: sanA, piece: onlyA[0][1], square: onlyA[0][0] };
  if (onlyB.length > 0 && onlyA.length === 0) return { keeps: sanA, drops: sanB, piece: onlyB[0][1], square: onlyB[0][0] };
  return null;
}

/** Spoken from the student's seat. */
export function contrastClause(
  c: MoveContrast,
  /** REQUIRED — the board the piece stands on and the student's colour: the
   *  piece is named by what it is (`pieceRef`), its square lit, not read out. */
  fen: string,
  student: Color,
  /** REQUIRED — the move the student played: it is "your move", and only the
   *  other is named, so the turn names its move once (decision baseline
   *  2026-11-12: "You played h4 … The difference between h4 and Be2: h4 keeps
   *  your g-pawn defended" said h4 three times). Null where neither was. */
  played: string | null,
): string {
  const piece = pieceRef(fen, c.square, student)?.words ?? `your ${NAME[c.piece] ?? 'piece'} on ${c.square}`;
  const bare = (san: string): string => san.replace(/[+#!?]+$/, '');
  // Said as what YOUR move did to the piece, the other move as the comparison:
  // "Here b3 keeps your g-pawn defended" read as if b3 guarded it (decision
  // baseline, colle800 Bd3 — the bishop that left f1 was the guard). Two
  // phrasings, rotated on the board (human voice rule 6).
  const key = stemKeyOf(fen);
  if (played && bare(played) === bare(c.keeps)) return rotateStem([
    `Your move keeps ${piece} defended, where ${c.drops} would have left it with no guard`,
    `Your move keeps ${piece} guarded. After ${c.drops} it would have had no guard`,
  ], key);
  if (played && bare(played) === bare(c.drops)) return rotateStem([
    `Your move leaves ${piece} with no guard, where ${c.keeps} would have kept it defended`,
    `Your move leaves ${piece} unguarded. After ${c.keeps} it would still have been defended`,
  ], key);
  // Led by a word, never the SAN (spoken, a leading SAN opens lowercase).
  return `The difference between ${c.keeps} and ${c.drops}: ${c.keeps} keeps ${piece} defended, and ${c.drops} leaves it with no guard`;
}
