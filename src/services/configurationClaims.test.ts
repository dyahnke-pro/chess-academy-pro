// The guard that stripping squares was not enough to replace.
//
// Caught on prod, move 4 of a live game (David 2026-08-08). The coach said:
//   "Doubled rooks on the open file x-ray the opposing rook behind a knight,
//    pinning that knight to the back rank."
// with every rook still on its starting square. The note names no SQUARE, so
// the geometry guard passed it, and `gradeNarrationText` keeps it too — that
// grader settles square-anchored claims, and this sentence has none.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { falseConfigurationClaim, configurationClaimsHold } from './configurationClaims';

/** The exact position from the prod run. */
const MOVE_4 = 'rnbqkb1r/pp1ppppp/5n2/8/3QP3/8/PPP2PPP/RNB1KBNR w KQkq - 1 4';
const THE_LIE = 'Doubled rooks on the open file x-ray the opposing rook behind a knight, pinning that knight to the back rank.';

describe('configuration claims', () => {
  it('THE REGRESSION: rejects the sentence that shipped', () => {
    expect(falseConfigurationClaim(THE_LIE, MOVE_4)).toBe('doubled rooks');
    expect(configurationClaimsHold(THE_LIE, MOVE_4)).toBe(false);
  });

  it('allows the same sentence when the board really has it', () => {
    // Rooks doubled on the d-file, no pawns on it.
    // Rooks on d1 AND d2 — same file. (The first draft used d1/e1, which is
    // two rooks on adjacent files, i.e. not doubled at all; the check was
    // right and the fixture was wrong.)
    const real = '4k3/8/8/8/8/8/PPPR1PPP/3R2K1 w - - 0 20';
    expect(falseConfigurationClaim('Doubled rooks on the open file are crushing.', real)).toBeNull();
  });

  it('judges only what it can settle — an unlisted claim is left alone', () => {
    // A guard that guesses is worse than one that admits its scope.
    expect(falseConfigurationClaim('The knight dreams of a beautiful future.', MOVE_4)).toBeNull();
  });

  it('catches each structural claim it advertises', () => {
    const start = new Chess().fen();
    // At the start there is no open file, no passer, no doubled/isolated pawn,
    // and the queens are still on.
    expect(falseConfigurationClaim('Seize the open file.', start)).toBe('open file');
    expect(falseConfigurationClaim('Push the passed pawn.', start)).toBe('passed pawn');
    expect(falseConfigurationClaim('Those doubled pawns are weak.', start)).toBe('doubled pawns');
    expect(falseConfigurationClaim('The isolated pawn is the target.', start)).toBe('isolated pawn');
    expect(falseConfigurationClaim('With queens off, the king walks up.', start)).toBe('queens off');
    // …but the bishop pair IS there at the start, so that one passes.
    expect(falseConfigurationClaim('The bishop pair gives long-term pressure.', start)).toBeNull();
  });

  it('an unreadable board judges nothing rather than guessing', () => {
    expect(falseConfigurationClaim(THE_LIE, 'not a fen')).toBeNull();
  });
});
