// queenKnightNet — QUEEN AND KNIGHT CLOSE A NET ROUND THE KING (Danya have-check, 2026-11-19).
//
// Danya (endgame-attacks-part-2, the-greek-gift-sacrifice-lives-on#3): "the
// queen and knight are such a potent force that they can frequently overcome
// … " and "Queen and knight coordinate in an instant, up close and at
// distance". The mate reads find a mate once it is forced; the king reads
// count attackers. Nothing read the pair itself: the queen covering one set of
// the king's squares, the knight the ones a queen cannot, so that between them
// the king has one square left or none.
//
// The read, chess.js and the engine's best line only (G0): the side the line
// favours by a pawn and a half or more (or a mate; unscored, the side to
// move) has a queen and a knight;
// on the board after one of that side's first four moves in the line, the
// other king has at most one square to go to, the queen covers one of its
// squares and the knight another, and without either piece it would have two
// or more (both are needed). Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { type EngineLine, lineScore, other, playLine, sortedLines } from './engineLineRead';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface QueenKnightNet { side: Color; king: Square; queen: Square; knight: Square; ply: number; text: string; squares: Square[] }

const FILES = 'abcdefgh';

/** The king's neighbour squares not holding its own pieces. */
function kingSquares(c: Chess, king: Square, col: Color): Square[] {
  const f = FILES.indexOf(king[0]); const r = Number(king[1]);
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const ff = f + df; const rr = r + dr;
    if (ff < 0 || ff > 7 || rr < 1 || rr > 8) continue;
    const sq = `${FILES[ff]}${rr}` as Square;
    const p = c.get(sq);
    if (!p || p.color !== col) out.push(sq);
  }
  return out;
}

/** Squares of `sqs` that `side`'s pieces attack, leaving out the pieces on `skip`. */
function covered(c: Chess, sqs: readonly Square[], side: Color, skip: readonly Square[]): Set<Square> {
  const out = new Set<Square>();
  for (const s of sqs) if (c.attackers(s, side).some((a) => !skip.includes(a))) out.add(s);
  return out;
}

export function queenKnightNet(fen: string, lines: readonly EngineLine[], student: Color): QueenKnightNet | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const toMove = c.turn();
  const ls = sortedLines(lines, toMove);
  if (!ls.length) return null;
  // Unscored (the record's one line): the side to move's own line.
  const scored = ls[0].cp != null || ls[0].mate != null;
  const top = lineScore(ls[0], toMove);
  if (scored && Math.abs(top) < 150) return null;
  const side: Color = !scored || top > 0 ? toMove : other(toMove);
  const { moves, boards } = playLine(fen, ls[0].moves, 8);
  let own = 0;
  for (let i = 0; i < moves.length; i++) {
    if (moves[i].color !== side) continue;
    if (++own > 4) break;
    const b = new Chess(boards[i + 1]);
    const queens = b.findPiece({ type: 'q', color: side }); const knights = b.findPiece({ type: 'n', color: side });
    const king = b.findPiece({ type: 'k', color: other(side) })[0];
    if (!king || queens.length !== 1 || !knights.length) continue;
    const q = queens[0];
    const ring = kingSquares(b, king, other(side));
    const all = covered(b, ring, side, []);
    const free = ring.length - all.size;
    if (free > 1) continue;
    for (const n of knights) {
      const noQueen = ring.length - covered(b, ring, side, [q]).size;
      const noKnight = ring.length - covered(b, ring, side, [n]).size;
      if (noQueen < 2 || noKnight < 2) continue;
      const qHits = ring.some((s) => b.attackers(s, side).includes(q));
      const nHits = ring.some((s) => b.attackers(s, side).includes(n));
      if (!qHits || !nHits) continue;
      const you = side === student;
      const key = stemKeyOf(`${fen}|qn-net`);
      const left = free === 0 ? 'no square left' : 'one square left';
      const text = you
        ? rotateStem([
          `Your queen and knight work together here. In the best line, their king on ${king} is left with ${left}: the queen covers some of its squares and the knight the rest.`,
          `This is the queen-and-knight pair at its best. A few moves in, the queen and the knight between them leave their king on ${king} with ${left}, and neither piece could do it alone.`,
        ], key)
        : rotateStem([
          `Watch their queen and knight. In the best line they leave your king on ${king} with ${left}: the queen takes some squares and the knight the rest.`,
          `Their queen and knight are the most dangerous pair near your king. A few moves in, between them your king on ${king} has ${left}, so keep your cover pawns where they are.`,
        ], key);
      return { side, king, queen: q, knight: n, ply: i, text, squares: [king] };
    }
  }
  return null;
}
