import { Chess, type Move } from 'chess.js';

/**
 * THE LEGAL MOVE A SAN MEANS ON THIS BOARD — by what it does, never by its
 * spelling. "Bb4+" and "Bb4" are the same move when the check does not exist
 * (live walk 2026-10-09: a book move "Bb4+" was legal after the student had
 * castled — no check any more — and the play step's exact-text match refused
 * it, so the coach never replied). chess.js resolves the suffix, the case and
 * the disambiguation; the caller gets the move it would actually make.
 */
export function legalMoveFor(fen: string, san: string): Move | null {
  try {
    return new Chess(fen).move(san) ?? null;
  } catch {
    return null;
  }
}

/**
 * THE BOOK'S NEXT MOVE — only while the game is still ON the book line. A
 * book move that is merely legal here can belong to another game: after
 * d3 Bc5 O-O the Two Knights line offered …Bb4+, a move from a position where
 * White had not castled. The line is replayed from the start and its position
 * must be this one; the move comes back spelled as it is on this board.
 */
export function bookContinuation(bookMoves: readonly string[] | null | undefined, fen: string): string | null {
  if (!bookMoves) return null;
  const ply = (Number.parseInt(fen.split(' ')[5] ?? '1', 10) - 1) * 2 + (fen.split(' ')[1] === 'b' ? 1 : 0);
  if (ply < 0 || ply >= bookMoves.length) return null;
  const line = new Chess();
  for (const m of bookMoves.slice(0, ply)) {
    try { if (!line.move(m)) return null; } catch { return null; }
  }
  const here = (f: string): string => f.split(' ').slice(0, 4).join(' ');
  if (here(line.fen()) !== here(fen)) return null;
  return legalMoveFor(fen, bookMoves[ply])?.san ?? null;
}
