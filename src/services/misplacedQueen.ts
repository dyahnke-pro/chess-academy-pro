// misplacedQueen — THE QUEEN DOING LITTLE WHERE SHE STANDS (Danya have-check, 2026-11-19).
//
// Danya: "White's weakest link is the passive queen on e2"; "the queen on a3
// looks badly misplaced"; "the queen is ineffective as the lead attacker on
// h6 — relocate it to e3, from which it still supports the attack". The worst
// piece read (`findWorstPlacedPiece`) judges minors and rooks by their squares,
// so a queen could never be named.
//
// Which queen and where is read off the engine's line (`pieceWork` measures it):
// in a line within a third of a pawn of the best, that side's first queen move
// in its first three moves is quiet (no capture, no check), the queen was not
// under attack (not a flight), it does little where it stands (five units or
// less), and the square it goes to does at least twice as much, and four units more. Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { pieceWork } from './pieceWork';
import { type EngineLine, PIECE_NAME, isQuiet, lineScore, other, playLine, sortedLines, seatWords } from './engineLineRead';
import { andList } from '../utils/andList';


export interface MisplacedQueen { side: Color; from: Square; to: Square; workNow: number; workThere: number; hits: string[]; text: string; squares: Square[] }

/** What the queen on `sq` hits of `color`'s enemy: their pieces, and their king's ring. */
function queenTargets(c: Chess, sq: Square, color: Color, student: Color): string[] {
  const theirs = color === student ? 'the' : 'your';
  const theirKing = color === student ? 'their king' : 'your king';
  const out: string[] = [];
  for (const p of c.board().flat()) {
    if (!p || p.color === color || p.type === 'k' || p.type === 'p') continue;
    if (c.attackers(p.square, color).includes(sq)) out.push(`${theirs} ${PIECE_NAME[p.type]} on ${p.square}`);
  }
  const king = c.findPiece({ type: 'k', color: other(color) })[0];
  if (king) {
    const f = king.charCodeAt(0); const r = Number(king[1]);
    const ring = [-1, 0, 1].flatMap((df) => [-1, 0, 1].map((dr) => `${String.fromCharCode(f + df)}${r + dr}`))
      .filter((s) => /^[a-h][1-8]$/.test(s) && s !== king) as Square[];
    if (ring.some((s) => c.attackers(s, color).includes(sq))) out.push(`the squares around ${theirKing}`);
  }
  return out;
}

export function misplacedQueen(fen: string, lines: readonly EngineLine[], student: Color): MisplacedQueen | null {
  let mover: Color;
  try { mover = new Chess(fen).turn(); } catch { return null; }
  const ls = sortedLines(lines, mover);
  if (!ls.length) return null;
  const best = lineScore(ls[0], mover);
  for (const l of ls) {
    if (best - lineScore(l, mover) > 30) continue;
    const { moves, boards } = playLine(fen, l.moves, 6);
    const seen: Record<Color, number> = { w: 0, b: 0 };
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i]; const side = m.color;
      seen[side]++;
      if (seen[side] > 3 || m.piece !== 'q') continue;
      if (!isQuiet(m)) break;
      // A queen still on its home square is development, not a misplaced piece.
      if (m.from === (side === 'w' ? 'd1' : 'd8')) break;
      const before = new Chess(boards[i]);
      if (before.attackers(m.from, other(side)).length > 0) break;
      const after = new Chess(boards[i + 1]);
      const workNow = pieceWork(before, m.from, 'q', side);
      const workThere = pieceWork(after, m.to, 'q', side);
      if (workNow > 5 || workThere < workNow * 2 || workThere - workNow < 4) break;
      const hits = queenTargets(after, m.to, side, student);
      if (!hits.length) break;
      const w = seatWords(side, student);
      const text = `${w.Whose} queen on ${m.from} is misplaced: it does very little there. From ${m.to} it would hit ${andList(hits)}.`;
      return { side, from: m.from, to: m.to, workNow, workThere, hits, text, squares: [m.from, m.to] };
    }
  }
  return null;
}
