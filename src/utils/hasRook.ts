// A file opened "for the rooks" is a road only for a side that HAS a rook
// (Danya Review tapes: "it half-opens the e-file for the rooks" and "a rook on
// an open file reaches your camp" said in pawn endings, 4 lines, 2 games).
// A LEAF: chess.js only.
import { Chess, type Color } from 'chess.js';

export function hasRook(fen: string, color: Color): boolean {
  try { return new Chess(fen).board().flat().some((c) => !!c && c.type === 'r' && c.color === color); } catch { return false; }
}
