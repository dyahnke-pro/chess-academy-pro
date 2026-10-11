// WHERE THE CAPTURED PIECE STOOD. For every capture but one that is the
// landing square; en passant takes the pawn BESIDE it (same file as the
// landing square, the capturer's starting rank). Naming `move.to` for an en
// passant capture claimed a pawn on an empty square (board sweep 2026-10-10:
// "takes their pawn on f3", f3 empty). Every "<piece> on <square>" a capture
// sentence says reads this one function.
import type { Move } from 'chess.js';

export function capturedSquare(move: Move): string {
  return move.isEnPassant() ? `${move.to[0]}${move.from[1]}` : move.to;
}
