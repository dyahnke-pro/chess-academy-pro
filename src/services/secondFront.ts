// secondFront — THE SECOND FRONT (Danya have-check, 2026-11-19).
//
// Danya (mysterious-gm-moves#3): "all of these factors should allow some kind
// of decisive invasion on the kingside, but no such invasion exists … in order
// to exploit a strategic advantage you must open a second front" — the
// principle of two weaknesses: a defender who holds one wing cannot hold both.
// The plan reads find a target; nothing read that the better side's pieces are
// all on one wing with no way in there, and the play has to start on the other.
//
// The read, chess.js and the engine's best line only (G0): the side the line
// favours by half a pawn or more has three or more pieces (knights, bishops,
// rooks, queen) and at least three in four of them on one wing; in the best
// line's first eight moves that side captures nothing on that wing (no way in
// there), and moves a piece across to the other wing or a pawn on it; and on
// the other wing it has a pawn one or two clear pushes from hitting an enemy
// pawn (the lever that opens the front), both on the wing's own files (a–c or
// f–h: a centre break is not a second front). The first wing is where the
// other king stands. Both seats.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { type EngineLine, lineScore, other, playLine, sortedLines } from './engineLineRead';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface SecondFront { side: Color; wing: 'kingside' | 'queenside'; lever: string; target: Square; text: string; squares: Square[] }

const KINGSIDE = 'efgh';
/** A wing's own files, the centre files left out: a lever there is a second front, not a central break. */
const FAR: Record<'kingside' | 'queenside', string> = { kingside: 'fgh', queenside: 'abc' };
const wingOf = (sq: string): 'kingside' | 'queenside' => (KINGSIDE.includes(sq[0]) ? 'kingside' : 'queenside');

/** The side's pawn on `wing` that one or two clear pushes bring into contact with an enemy pawn. */
function leverOn(c: Chess, side: Color, wing: 'kingside' | 'queenside'): { san: string; target: Square } | null {
  const dir = side === 'w' ? 1 : -1;
  for (const p of c.board().flat()) {
    if (!p || p.type !== 'p' || p.color !== side || !FAR[wing].includes(p.square[0])) continue;
    const f = p.square.charCodeAt(0); let r = Number(p.square[1]);
    for (let push = 1; push <= 2; push++) {
      r += dir;
      if (r < 1 || r > 8) break;
      const sq = `${String.fromCharCode(f)}${r}` as Square;
      if (c.get(sq)) break;
      // A double step only from the home rank.
      if (push === 2 && Number(p.square[1]) !== (side === 'w' ? 2 : 7)) break;
      for (const df of [-1, 1]) {
        const tf = f + df; if (tf < 97 || tf > 104) continue;
        const t = `${String.fromCharCode(tf)}${r + dir}` as Square;
        const q = c.get(t);
        if (q && q.type === 'p' && q.color !== side && FAR[wing].includes(t[0])) return { san: sq, target: t };
      }
    }
  }
  return null;
}

export function secondFront(fen: string, lines: readonly EngineLine[], student: Color): SecondFront | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const toMove = c.turn();
  const ls = sortedLines(lines, toMove);
  if (!ls.length) return null;
  const top = lineScore(ls[0], toMove);
  if (Math.abs(top) < 50) return null;
  const side: Color = top > 0 ? toMove : other(toMove);
  const pieces = c.board().flat().filter((p) => p && p.color === side && 'nbrq'.includes(p.type));
  if (pieces.length < 3) return null;
  const king = pieces.filter((p) => p && wingOf(p.square) === 'kingside').length;
  const crowded: 'kingside' | 'queenside' = king * 2 >= pieces.length ? 'kingside' : 'queenside';
  const onCrowded = crowded === 'kingside' ? king : pieces.length - king;
  if (onCrowded * 4 < pieces.length * 3) return null;
  // The pieces are massed at their king: the first front is the attack.
  const theirKing = c.findPiece({ type: 'k', color: other(side) })[0];
  if (!theirKing || !FAR[crowded].includes(theirKing[0])) return null;
  const otherWing = crowded === 'kingside' ? 'queenside' : 'kingside';
  const lever = leverOn(c, side, otherWing);
  if (!lever) return null;
  const { moves } = playLine(fen, ls[0].moves, 8);
  const own = moves.filter((m: Move) => m.color === side);
  if (own.some((m) => m.captured && wingOf(m.to) === crowded)) return null;
  const switches = own.some((m) => (m.piece !== 'p' && m.piece !== 'k' && wingOf(m.from) === crowded && wingOf(m.to) === otherWing)
    || (m.piece === 'p' && wingOf(m.from) === otherWing));
  if (!switches) return null;
  const you = side === student;
  const leverSan = lever.san;
  const key = stemKeyOf(`${fen}|second-front`);
  const text = you
    ? rotateStem([
      `Your pieces are all on the ${crowded}, and there is no way in there. Open a second front: ${leverSan} goes at their pawn on ${lever.target}, and they can't hold both wings.`,
      `Everything of yours is on the ${crowded}, but nothing breaks through there. The play is on the other wing: ${leverSan} hits their pawn on ${lever.target}, and two weaknesses are too many to hold.`,
    ], key)
    : rotateStem([
      `Their pieces are all on the ${crowded}, with no way in there, so expect a second front: ${leverSan} against your pawn on ${lever.target}. Two weak wings are much harder to hold than one.`,
      `They have no way through on the ${crowded}, so the danger is the other wing: ${leverSan} hits your pawn on ${lever.target}. Holding one wing is easy. Holding both is not.`,
    ], key);
  return { side, wing: crowded, lever: leverSan, target: lever.target, text, squares: [leverSan as Square, lever.target] };
}
