// seatPieces — give each bare "<piece> on <square>" in a detector sentence its
// owner, read from the board (hand walk 2026-09-24: the coach said "Bishop on h5
// pins knight on e2 against queen on d1." — nobody's pieces). A leaf: chess.js
// only, so every lane that speaks a detector description can use it.
import { Chess, type Color, type Square } from 'chess.js';

export function seatBare(text: string, fen: string, student: Color): string {
  let b: Chess;
  try { b = new Chess(fen); } catch { return text; }
  const out = text.replace(/(\b(?:your|their|my|his|her)\s+)?\b(pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])\b/gi,
    (whole: string, owned: string | undefined, piece: string, square: string) => {
      if (owned) return whole;
      const at = b.get(square as Square);
      if (!at) return whole;
      return `${at.color === student ? 'your' : 'their'} ${piece.toLowerCase()} on ${square}`;
    });
  return out.charAt(0).toUpperCase() + out.slice(1);
}
