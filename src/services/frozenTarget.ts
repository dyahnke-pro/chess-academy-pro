// frozenTarget — THE PAWN WILL FALL, AND NOTHING CAN COME TO HELP (Danya,
// the-positional-sacrifice: "the a6 pawn will fall, while Black's entire
// queenside is frozen in place").
//
// `findWeakPawns` names a weak pawn; nothing counted whether it can be held.
// The read, chess.js only (G0), both seats:
//   · a weak pawn (isolated, backward or doubled, `findWeakPawns`) that cannot
//     move: the square in front is taken or covered by an enemy pawn, and it
//     has nothing to capture;
//   · no pawn of its side stands on a neighbouring file behind it, so no pawn
//     can ever come to guard it — it is frozen;
//   · counted over two moves, each side handed the move: the attacker's pieces
//     that can stand on a safe square hitting it (already there, or one or two
//     moves away) against the defender's pieces that can stand on a safe square
//     guarding it the same way — and the attacker has strictly more.
// A square is SAFE for a piece when the other side cannot win material taking
// it there (the legal exchange, `legalSeeGainOn`); a king's moves are its
// legal moves. The claim is the count, never the engine's verdict.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { findWeakPawns, legalSeeGainOn } from './positionReadingService';
import { sideToMoveAs } from './threatOut';
import { PIECE_NAMES } from '../types/tacticTypes';
import { andList, countWord } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { openSentence } from '../utils/openSentence';

export interface Reacher { square: Square; type: PieceSymbol; moves: 0 | 1 | 2 }

export interface FrozenTarget {
  /** The side that wins the pawn. */
  side: Color;
  pawn: Square;
  attackers: Reacher[];
  defenders: Reacher[];
  text: string;
  squares: Square[];
}

/** Does the piece now on `at` (on `c`) hit `target`? */
function hits(c: Chess, at: Square, target: Square, color: Color): boolean {
  return c.attackers(target, color).includes(at);
}

/** Can `color`'s piece stand on `at` (on `c`, the other side to move) without
 *  the other side winning material by taking it? */
function safeOn(c: Chess, at: Square): boolean {
  return legalSeeGainOn(c, at) < 1;
}

/** The fewest moves (0–2) `color`'s piece on `from` needs to stand safely
 *  hitting `target`, `color` handed the move; null when more. */
function reach(fen: string, from: Square, target: Square, color: Color): 0 | 1 | 2 | null {
  const own = sideToMoveAs(fen, color);
  if (!own) return null;
  const base = new Chess(own);
  if (hits(base, from, target, color)) return 0;
  let best: 1 | 2 | null = null;
  for (const m1 of base.moves({ square: from, verbose: true })) {
    if (m1.to === target) continue; // taking it is the fall, not a count
    const a = new Chess(own);
    a.move(m1.san);
    if (hits(a, m1.to, target, color)) {
      if (safeOn(a, m1.to)) return 1;
      continue;
    }
    if (best !== null) continue;
    const back = sideToMoveAs(a.fen(), color);
    if (!back) continue;
    const b = new Chess(back);
    for (const m2 of b.moves({ square: m1.to, verbose: true })) {
      if (m2.to === target) continue;
      const d = new Chess(back);
      d.move(m2.san);
      if (hits(d, m2.to, target, color) && safeOn(d, m2.to)) { best = 2; break; }
    }
  }
  return best;
}

/** Every non-pawn piece of `color` and the moves it needs to reach `target`. */
function reachers(fen: string, target: Square, color: Color): Reacher[] {
  const c = new Chess(fen);
  const out: Reacher[] = [];
  for (const row of c.board()) for (const cell of row) {
    if (!cell || cell.color !== color || cell.type === 'p') continue;
    const n = reach(fen, cell.square, target, color);
    if (n !== null) out.push({ square: cell.square, type: cell.type, moves: n });
  }
  return out.sort((a, b) => a.moves - b.moves || a.square.localeCompare(b.square));
}

/** Is `color`'s pawn on `sq` stuck where it stands, with no pawn behind it on a
 *  neighbouring file to come to its aid? */
function frozen(c: Chess, sq: Square, color: Color): boolean {
  const f = sq.charCodeAt(0) - 97;
  const r = Number(sq[1]);
  const up = color === 'w' ? 1 : -1;
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const ahead = `${sq[0]}${r + up}` as Square;
  if (r + up < 1 || r + up > 8) return false;
  // Blocked, or the step forward walks onto an enemy pawn's square.
  const blocked = !!c.get(ahead) || [-1, 1].some((df) => {
    const ff = f + df;
    const rr = r + 2 * up;
    if (ff < 0 || ff > 7 || rr < 1 || rr > 8) return false;
    const p = c.get(`${String.fromCharCode(97 + ff)}${rr}` as Square);
    return !!p && p.type === 'p' && p.color === enemy;
  });
  if (!blocked) return false;
  // It cannot trade itself off: nothing of theirs on its capture squares.
  for (const df of [-1, 1]) {
    const ff = f + df;
    if (ff < 0 || ff > 7) continue;
    const p = c.get(`${String.fromCharCode(97 + ff)}${r + up}` as Square);
    if (p && p.color === enemy) return false;
  }
  // No pawn of its own on a neighbouring file, level with it or behind it,
  // that could step up to guard it.
  for (const row of c.board()) for (const cell of row) {
    if (!cell || cell.type !== 'p' || cell.color !== color) continue;
    const cf = cell.square.charCodeAt(0) - 97;
    const cr = Number(cell.square[1]);
    if (Math.abs(cf - f) !== 1) continue;
    if (color === 'w' ? cr < r : cr > r) return false;
  }
  return true;
}

/** The weak pawn that falls on the board, either side's, from the student's
 *  seat; null when none. */
export function frozenTarget(fen: string, student: Color): FrozenTarget | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.isGameOver()) return null;
  const toMove = c.turn();
  // The side to move's chance first: it moves first in the count.
  for (const side of [toMove, toMove === 'w' ? 'b' : 'w'] as Color[]) {
    const victim: Color = side === 'w' ? 'b' : 'w';
    const weak = findWeakPawns(fen, victim);
    const pawns = [...new Set([...weak.isolated, ...weak.backward, ...weak.doubled])].sort();
    for (const pawn of pawns) {
      if (!frozen(c, pawn, victim)) continue;
      const attackers = reachers(fen, pawn, side);
      if (attackers.length === 0) continue;
      const defenders = reachers(fen, pawn, victim);
      if (attackers.length <= defenders.length) continue;
      const mine = side === student;
      const pawnOwn = mine ? 'their' : 'your';
      const pieceOwn = mine ? 'your' : 'their';
      const otherOwn = mine ? 'theirs' : 'yours';
      const named = andList(attackers.map((a) => `the ${PIECE_NAMES[a.type]} on ${a.square}`));
      const guard = defenders.length === 0
        ? `none of ${otherOwn} can guard it`
        : `only ${countWord(defenders.length)} of ${otherOwn} can guard it`;
      const key = stemKeyOf(`${fen}|frozen-target`);
      const lead = rotateStem([
        `${openSentence(pawnOwn)} pawn on ${pawn} will fall.`,
        `${openSentence(pawnOwn)} pawn on ${pawn} cannot be held.`,
      ], key);
      const count = `${openSentence(countWord(attackers.length))} of ${pieceOwn} pieces can reach it, ${named}, and ${guard}.`;
      const freeze = rotateStem([
        'It cannot move, and no pawn can come to its aid.',
        'It is frozen in place, and no pawn can step up to guard it.',
      ], key + 1);
      const close = mine ? 'Bring them all to bear on it.' : 'Bring a guard to it, or find play elsewhere before it drops.';
      const text = `${lead} ${count} ${freeze} ${close}`;
      const squares: Square[] = [pawn, ...attackers.map((a) => a.square), ...defenders.map((d) => d.square)];
      return { side, pawn, attackers, defenders, text, squares: [...new Set(squares)] };
    }
  }
  return null;
}
