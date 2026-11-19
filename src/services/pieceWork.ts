// pieceWork — HOW MUCH A PIECE DOES WHERE IT STANDS (2026-11-19).
//
// Danya's most repeated positional lesson: "if one piece stands badly, the
// whole game stands badly — find your worst piece and improve it." The worst
// piece is not only a stuck one: on his boards it is the queen on e2 that
// touches nothing, the rook on d1 behind its own pawn, the knight on the rim.
// `findWorstPlacedPiece` judges minors and lifted rooks by how few squares
// they have, so a queen or a back-rank rook could never be named, and a piece
// with squares but no work could never be named either.
//
// This measures WORK, not squares: what a piece hits on the side of the board
// where the game is (their half, their king, their pieces). Which piece to
// improve, and where, is read off the engine's quiet line (`planSteps`'s
// one-piece road); this number checks the road ends somewhere better. A static
// search for the best square (no engine) found Danya's piece on 4 of 12 of his
// boards and fired on 9 boards in 10 — the plan decides which piece, so the
// engine's line does. Board-true, chess.js only (G0).
import { Chess } from 'chess.js';
import type { Color, PieceSymbol, Square } from 'chess.js';

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const STEPS: Record<'n' | 'b' | 'r' | 'q', Array<[number, number]>> = {
  n: [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]],
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
};
const SLIDES: Record<'n' | 'b' | 'r' | 'q', boolean> = { n: false, b: true, r: true, q: true };

function sqOf(f: number, r: number): Square { return `${'abcdefgh'[f]}${r + 1}` as Square; }
function coords(sq: string): [number, number] { return [sq.charCodeAt(0) - 97, Number(sq[1]) - 1]; }

/** What a piece of `type` on `sq` hits for `color` on `chess`: every square on
 *  its rays up to and including the first piece. */
function hits(chess: Chess, sq: Square, type: 'n' | 'b' | 'r' | 'q'): Square[] {
  const [f0, r0] = coords(sq);
  const out: Square[] = [];
  for (const [df, dr] of STEPS[type]) {
    let f = f0 + df; let r = r0 + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const s = sqOf(f, r);
      out.push(s);
      if (!SLIDES[type] || chess.get(s)) break;
      f += df; r += dr;
    }
  }
  return out;
}

/** THE WORK a piece does from `sq`: each square it hits counts for where it
 *  is — half in its own half, one in theirs, three beside their king — and a
 *  piece of theirs it hits counts for what it is, double when nothing guards
 *  it. One number every square of a road is read with. */
export function pieceWork(chess: Chess, sq: Square, type: 'n' | 'b' | 'r' | 'q', color: Color): number {
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const kingSq = chess.findPiece({ type: 'k', color: enemy })[0];
  const [kf, kr] = kingSq ? coords(kingSq) : [-9, -9];
  let work = 0;
  for (const s of hits(chess, sq, type)) {
    const [f, r] = coords(s);
    const theirHalf = color === 'w' ? r >= 4 : r <= 3;
    work += theirHalf ? 1 : 0.5;
    if (Math.max(Math.abs(f - kf), Math.abs(r - kr)) <= 1) work += 2;
    const p = chess.get(s);
    if (p && p.color === enemy && p.type !== 'k') {
      const guarded = chess.attackers(s, enemy).length > 0;
      work += Math.min(VALUE[p.type], 5) * (guarded ? 0.3 : 0.6);
    }
  }
  return work;
}
