import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';

/** Play a SAN list and return the FEN before the LAST move + that move. */
function beforeLast(sans: string[]): { fen: string; san: string } {
  const c = new Chess();
  for (let i = 0; i < sans.length - 1; i++) c.move(sans[i]);
  return { fen: c.fen(), san: sans[sans.length - 1] };
}

describe('buildReviewMoveTeaching (grounded per-move review why)', () => {
  it('names the center on a central pawn push', () => {
    const t = buildReviewMoveTeaching(new Chess().fen(), 'e4');
    expect(t).toMatch(/center/i);
  });

  it('calls castling king safety — never restates "castles"', () => {
    const { fen, san } = beforeLast(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']);
    const t = buildReviewMoveTeaching(fen, san);
    expect(t).toMatch(/king/i);
    expect(t).not.toMatch(/^castles/i);
  });

  it('names only the central squares a knight genuinely controls (empty/enemy, not its own pawn)', () => {
    // 1.e4 e5 2.Nf3 — the knight controls e5 (enemy pawn), NOT d4 (empty here,
    // included) but never a square held by White's own pawn.
    const { fen, san } = beforeLast(['e4', 'e5', 'Nf3']);
    const t = buildReviewMoveTeaching(fen, san);
    expect(t).toMatch(/knight/i);
    expect(t).toMatch(/e5/); // the enemy pawn it hits
  });

  it('stays SILENT on a bishop whose diagonals are blocked by its own pawns (no overstatement)', () => {
    // 1.e4 d6 2.d4 g6 3.f4 e6 4.Be3 — the e3-bishop is blocked by its own
    // d4 + f4 pawns; there is no central square it controls → silence.
    const { fen, san } = beforeLast(['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3']);
    expect(buildReviewMoveTeaching(fen, san)).toBeNull();
  });

  it('does not invent a reason for a quiet queen move', () => {
    const { fen, san } = beforeLast(['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3', 'b6', 'c4', 'Bg7', 'Qd2']);
    expect(buildReviewMoveTeaching(fen, san)).toBeNull();
  });

  it('opens a file on a capture that leaves a half-open file behind', () => {
    // …exd6 leaves White with no e-pawn → e-file half-open.
    const line = ['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3', 'b6', 'c4', 'Bg7', 'Qd2', 'Nf6', 'Bd3', 'Na6', 'Nf3', 'c6', 'O-O', 'Nc7', 'e5', 'Nd7', 'exd6'];
    const { fen, san } = beforeLast(line);
    const t = buildReviewMoveTeaching(fen, san);
    expect(t).toMatch(/e-file/i);
  });
});
