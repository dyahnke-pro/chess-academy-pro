// squareForPiece — A SQUARE GIVEN UP TO BURY A PIECE (Danya have-check, 2026-11-19).
//
// Danya (weak-squares-who-cares#3, Fischer–Unzicker): "In Fischer-Unzicker,
// White weakened the e5 square but totally restricted the movement of the c8
// bishop in return … the disobedience of one positional principle (do not
// voluntarily weaken a square) is the observance of another". The hole reads
// see a square no pawn can ever guard; nothing weighed the hole against what
// the same pawn move took from an enemy piece.
//
// The read, chess.js and the engine's top lines only (G0): in a line within
// half a pawn of the best, one of the side to move's first three moves is a
// quiet pawn push that (a) leaves behind a square it guarded that no pawn of
// that side can ever guard again — a hole on the c–f files, on its fourth
// rank or beyond — and (b) cuts an
// enemy bishop or knight from three or more safe squares to one or none (a
// safe square: empty or holding an enemy of it, and no pawn of the pusher
// hits it). Both seats.
import { sideToMoveAs } from './threatOut';
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { type EngineLine, PIECE_NAME, lineScore, other, playLine, sortedLines } from './engineLineRead';
import { noPawnCanChallenge, relativeRank } from './outpost';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface SquareForPiece { side: Color; push: string; hole: Square; buried: Square; text: string; squares: Square[] }

/** The piece's moves to squares no pawn of `against` hits (its own colour's turn forced). */
function safeSquares(fen: string, sq: Square, against: Color): number {
  const owner = against === 'w' ? 'b' : 'w';
  const turned = sideToMoveAs(fen, owner);
  if (!turned) return -1;
  let c: Chess;
  try { c = new Chess(turned); } catch { return -1; }
  const ms = c.moves({ square: sq, verbose: true });
  // Moves through the board's legality; a pinned piece reads as none either way.
  return ms.filter((m) => !c.attackers(m.to, against).some((a) => c.get(a)?.type === 'p')).length;
}

function holesLeft(before: Chess, after: Chess, m: Move): Square[] {
  const side = m.color; const dir = side === 'w' ? 1 : -1;
  const out: Square[] = [];
  const f = m.from.charCodeAt(0); const r = Number(m.from[1]) + dir;
  for (const df of [-1, 1]) {
    const tf = f + df; if (tf < 99 || tf > 102) continue; // c–f
    const sq = `${String.fromCharCode(tf)}${r}` as Square;
    // A hole the other side can use: the pusher's fourth rank or beyond.
    if (relativeRank(sq, side) < 4) continue;
    if (!before.attackers(sq, side).includes(m.from)) continue;
    const occ = after.get(sq);
    if (occ && occ.type === 'p' && occ.color === side) continue;
    // No pawn of the pusher's can ever guard it again (`noPawnCanChallenge` read from the other side).
    if (noPawnCanChallenge(after, sq, other(side))) out.push(sq);
  }
  return out;
}

export function squareForPiece(fen: string, lines: readonly EngineLine[], student: Color): SquareForPiece | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const side = c.turn();
  const ls = sortedLines(lines, side);
  if (!ls.length) return null;
  const top = lineScore(ls[0], side);
  for (const l of ls) {
    if (top - lineScore(l, side) > 50) continue;
    const { moves, boards } = playLine(fen, l.moves, 5);
    for (let i = 0; i < moves.length; i += 2) {
      const m = moves[i];
      if (m.piece !== 'p' || m.captured || m.promotion || m.san.includes('+')) continue;
      const before = new Chess(boards[i]); const after = new Chess(boards[i + 1]);
      const holes = holesLeft(before, after, m);
      if (!holes.length) continue;
      for (const p of after.board().flat()) {
        if (!p || p.color === side || (p.type !== 'b' && p.type !== 'n')) continue;
        const was = safeSquares(boards[i], p.square, side);
        const now = safeSquares(boards[i + 1], p.square, side);
        if (was < 3 || now < 0 || now > 1) continue;
        const you = side === student;
        const theirs = you ? 'their' : 'your';
        const key = stemKeyOf(`${fen}|square-for-piece`);
        const lead = i === 0 ? m.san : `The plan with ${m.san}`;
        const text = you
          ? rotateStem([
            `${lead} gives up the ${holes[0]} square for good, but it shuts in ${theirs} ${PIECE_NAME[p.type]} on ${p.square}. A square for a piece is a trade worth making.`,
            `${lead} leaves a hole on ${holes[0]}. In return ${theirs} ${PIECE_NAME[p.type]} on ${p.square} is left with nowhere to go, and a buried piece is worth more than a square.`,
          ], key)
          : rotateStem([
            `Watch for ${m.san}: it gives them a hole on ${holes[0]}, but it shuts in ${theirs} ${PIECE_NAME[p.type]} on ${p.square}. They are trading a square for a piece.`,
            `${m.san} would cost them the ${holes[0]} square, but it buries ${theirs} ${PIECE_NAME[p.type]} on ${p.square}. A square for a piece can be a good deal.`,
          ], key);
        return { side, push: m.san, hole: holes[0], buried: p.square, text, squares: [m.to, holes[0], p.square] };
      }
    }
  }
  return null;
}
