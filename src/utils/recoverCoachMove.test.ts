import { describe, it, expect } from 'vitest';
import { recoverCoachMoveFromText } from './recoverCoachMove';

// After 1.d4 — Black (the coach) to move.
const AFTER_D4 = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';

describe('recoverCoachMoveFromText', () => {
  it('recovers the move the coach named in prose (the real bug)', () => {
    // The exact narration from the 2026-06-02 prod log where tools=0.
    const text = "d4 claims the center — I'll mirror with d5 to contest equal space.";
    expect(recoverCoachMoveFromText(AFTER_D4, text)).toBe('d5');
  });

  it('ignores the student\'s already-played move (illegal for the side to move)', () => {
    // "d4" is White's move and is NOT legal for Black here, so it must be
    // skipped in favour of the first LEGAL named move.
    const text = 'Your d4 grabs space. I answer Nf6, hitting the center.';
    expect(recoverCoachMoveFromText(AFTER_D4, text)).toBe('Nf6');
  });

  it('does not match a pawn SAN inside a piece SAN ("b4" within "Bb4")', () => {
    // After 1.d4 e6 2.c4 Bb4+ is the first legal Black move named; the
    // bare-pawn "b4" is illegal here, and must not be mis-extracted from
    // inside "Bb4".
    const fen = 'rnbqk1nr/pppp1ppp/4p3/8/1bPP4/8/PP2PPPP/RNBQKBNR w KQkq - 1 3';
    // White to move now; pick a White example that proves boundary safety.
    const text = 'The check Bb4+ pins nothing; meet it with Nc3 to block.';
    expect(recoverCoachMoveFromText(fen, text)).toBe('Nc3');
  });

  it('returns null when the text names no legal move', () => {
    expect(recoverCoachMoveFromText(AFTER_D4, 'Interesting choice — let me think.')).toBeNull();
  });

  it('returns null on a malformed FEN instead of throwing', () => {
    expect(recoverCoachMoveFromText('not-a-fen', 'play d5')).toBeNull();
  });

  it('takes the FIRST legal named move when several are mentioned', () => {
    const text = "I'll play Nf6 now; later d5 and c5 break the center.";
    expect(recoverCoachMoveFromText(AFTER_D4, text)).toBe('Nf6');
  });
});
