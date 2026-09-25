// seatPieces — give each bare "<piece> on <square>" in a detector sentence its
// owner, read from the board (hand walk 2026-09-24: the coach said "Bishop on h5
// pins knight on e2 against queen on d1." — nobody's pieces). A leaf: chess.js
// only, so every lane that speaks a detector description can use it.
import { Chess, type Color, type Square } from 'chess.js';

export function seatBare(text: string, fen: string, student: Color): string {
  let b: Chess;
  try { b = new Chess(fen); } catch { return text; }
  // "the knight on b6" becomes "their knight on b6" — the article is REPLACED,
  // never kept ("the their knight", hand walk 2026-09-24).
  // A colour possessive is a determiner the same way ("White's king on g1"
  // became "White's your king on g1", hand walk 2340) — replaced too.
  const out = text.replace(/(\b(?:your|their|my|his|her|the|white's|black's)\s+)?\b(pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])\b/gi,
    (whole: string, owned: string | undefined, piece: string, square: string) => {
      if (owned && !/^(?:the|white's|black's)\s+$/i.test(owned)) return whole;
      const at = b.get(square as Square);
      if (!at) return whole;
      const lead = owned && /^[A-Z]/.test(owned) ? (at.color === student ? 'Your' : 'Their') : (at.color === student ? 'your' : 'their');
      return `${lead} ${piece.toLowerCase()} on ${square}`;
    });
  return out.charAt(0).toUpperCase() + out.slice(1);
}
