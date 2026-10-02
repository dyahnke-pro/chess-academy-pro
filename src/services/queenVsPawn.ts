// QUEEN AGAINST A PAWN ON THE SEVENTH (Naroditsky, Pawn Races: after a race,
// one side queens and the other's pawn stands one step from promotion; the
// classic rule every endgame manual states). Kings, one queen, one pawn on its
// seventh rank with its own king beside it:
//   • a centre or knight pawn (b, d, e, g) LOSES — the queen checks and pins
//     her way in until her king can come over;
//   • a rook or bishop pawn (a, c, f, h) usually DRAWS — the defending king
//     hides in the corner and taking the pawn would be stalemate — unless the
//     stronger side's king is already close enough to help.
// A LEAF: chess.js only. It states the rule; whether THIS position follows it
// is the tablebase's job (the drill generator keeps only positions it agrees on).
import { Chess } from 'chess.js';

export interface QueenVsPawn {
  /** The side with the queen. */
  queenSide: 'w' | 'b';
  pawn: string;
  kind: 'centre-or-knight' | 'rook-or-bishop';
  /** What the rule expects: the queen wins, or (rook/bishop pawn) a draw. */
  expect: 'win' | 'draw';
  text: string;
}

export function queenVsSeventh(fen: string): QueenVsPawn | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const pcs = c.board().flat().filter((p): p is NonNullable<typeof p> => !!p);
  if (pcs.length !== 4) return null;
  const q = pcs.find((p) => p.type === 'q');
  const pawn = pcs.find((p) => p.type === 'p');
  if (!q || !pawn || q.color === pawn.color) return null;
  if (Number(pawn.square[1]) !== (pawn.color === 'w' ? 7 : 2)) return null;
  const defK = pcs.find((p) => p.type === 'k' && p.color === pawn.color);
  if (!defK) return null;
  const near = Math.max(Math.abs(defK.square.charCodeAt(0) - pawn.square.charCodeAt(0)), Math.abs(Number(defK.square[1]) - Number(pawn.square[1]))) <= 1;
  if (!near) return null;
  const file = pawn.square[0];
  const rookOrBishop = 'acfh'.includes(file);
  const queenSide = q.color;
  const kind = rookOrBishop ? 'rook-or-bishop' : 'centre-or-knight';
  const fileWord = file === 'a' || file === 'h' ? 'rook' : file === 'c' || file === 'f' ? 'bishop' : file === 'b' || file === 'g' ? 'knight' : 'centre';
  const text = rookOrBishop
    ? `A queen against a ${fileWord} pawn on the seventh is usually a draw: the defending king runs into the corner, and taking the pawn would be stalemate — unless the queen's king is close enough to help.`
    : `A queen against a ${fileWord} pawn on the seventh wins: check, then pin or block, force the king in front of its own pawn, and every tempo that buys brings the queen's king one step closer.`;
  return { queenSide, pawn: pawn.square, kind, expect: rookOrBishop ? 'draw' : 'win', text };
}
