// sideToMove — THE ONE FLIP of the side to move (v5 re-run 2026-10-29). Five
// computers kept their own copy of "put this side on move", and four of them
// flipped a board whose side to move was in check: an illegal board, on which
// every move "gives check" with the check already standing — "it can leave
// with check — Nd7+" was the student's own king, already in check. A side in
// check cannot pass the move, so there is no board to read: null.
import { Chess } from 'chess.js';

/** `fen` with `color` to move (en passant cleared — a flip invalidates it), or
 *  null when that board is not a legal position: the side to move is in check,
 *  or the flipped board will not load. `fen` itself when `color` already moves. */
export function withMover(fen: string, color: 'w' | 'b'): string | null {
  const parts = fen.split(' ');
  if (parts.length < 4) return null;
  if (parts[1] === color) return fen;
  try { if (new Chess(fen).inCheck()) return null; } catch { return null; }
  parts[1] = color;
  parts[3] = '-';
  const flipped = parts.join(' ');
  try { new Chess(flipped); return flipped; } catch { return null; }
}
