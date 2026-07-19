import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildOpponentMoveTeaching } from './reviewOpponentCommentary';

/** Play a SAN list; return the FEN before the LAST move + that move. */
function beforeLast(sans: string[]): { fen: string; san: string } {
  const c = new Chess();
  for (let i = 0; i < sans.length - 1; i++) c.move(sans[i]);
  return { fen: c.fen(), san: sans[sans.length - 1] };
}

describe('buildOpponentMoveTeaching (read the opponent — targets in your position)', () => {
  it('flags a student piece left LOOSE by the opponent move, with an amber arrow', () => {
    // Student = White. Black plays a move whose piece attacks an undefended White piece.
    // Setup: White bishop on c4 undefended; Black plays ...b5 hitting it? No — build a
    // clean loose-piece case: White knight on e5 undefended, Black plays ...d6 attacking it.
    // Constructed position — a White knight en prise on e5.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4N3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 1';
    // Black to move; ...d6 attacks the e5-knight (undefended).
    const beat = buildOpponentMoveTeaching(fen, 'd6', 'w');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/loose|watch out/i);
    expect(beat!.text).toMatch(/e5/);
    expect(beat!.arrows[0]?.endSquare).toBe('e5');
    expect(beat!.arrows[0]?.color).toBe('#f59e0b');
  });

  it('names a weak student pawn the opponent trains on', () => {
    // Student = White with an isolated d-pawn on d4. Black rook/queen/piece attacks it.
    // White pawns: only d4 on the d-file, none on c/e → isolated. Black rook on d8 → d-file.
    const fen = '3rk3/8/8/8/3P4/8/8/4K3 b - - 0 1';
    // Black ...Rd5 trains the rook on the isolated d4-pawn? Rd8-d5 attacks d4 down the file.
    const beat = buildOpponentMoveTeaching(fen, 'Rd5', 'w');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/weak pawn|target/i);
    expect(beat!.text).toMatch(/d4/);
  });

  it('stays silent on a nothing opponent move (no target)', () => {
    // A quiet symmetric developing move that targets nothing.
    const { fen, san } = beforeLast(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']);
    // 3...Nf6 targets e4 (a pawn, defended) — not a weak pawn, no loose piece → silent.
    expect(buildOpponentMoveTeaching(fen, san, 'w')).toBeNull();
  });

  it('returns null when handed the STUDENT\'s own move (only comments the opponent)', () => {
    // fenBefore has White to move; asking with studentColor White → the move is the
    // student's, not the opponent's → null.
    const fen = new Chess().fen();
    expect(buildOpponentMoveTeaching(fen, 'e4', 'w')).toBeNull();
  });
});
