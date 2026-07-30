// The defect this guards, caught on prod: a note anchored at ["d4"] whose prose
// opens "After d4 d5 c4 e6 Nc3 Nf6…" spliced onto a Dutch Stonewall walkthrough
// and narrated Queen's Gambit theory over its first move.

import { describe, it, expect } from 'vitest';
import { recitedLine, noteContradictsLine, notePhaseMismatchesBoard } from './noteLineGuard';

const MARSHALL = 'After d4 d5 c4 e6 Nc3 Nf6, Black plays the Marshall Defense, which is considered dubious.';

describe('noteLineGuard', () => {
  it('reads the recited line out of the prose', () => {
    expect(recitedLine(MARSHALL)).toEqual(['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6']);
  });

  it('ignores prose that recites nothing', () => {
    expect(recitedLine('This move fights for the centre and frees the bishop.')).toEqual([]);
    expect(noteContradictsLine('A quiet developing move.', ['d4', 'f5'])).toBe(false);
  });

  it('rejects the note when the game played a different line', () => {
    // The Dutch Stonewall that actually triggered this on prod.
    expect(noteContradictsLine(MARSHALL, ['d4', 'f5', 'c4', 'Nf6'])).toBe(true);
  });

  it('rejects a recitation that runs deeper than the game has gone', () => {
    expect(noteContradictsLine(MARSHALL, ['d4'])).toBe(true);
  });

  it('keeps the note when the game did play that line', () => {
    expect(noteContradictsLine(MARSHALL, ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'])).toBe(false);
    expect(noteContradictsLine(MARSHALL, ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5'])).toBe(false);
  });

  it('leaves mid-game hypotheticals alone', () => {
    // Starts on a move the game did not open with — a continuation, not a claim
    // about the moves played.
    expect(noteContradictsLine('After Nf3 Ng5 Bxf7 the attack crashes through.', ['d4', 'f5'])).toBe(false);
  });
});

describe('notePhaseMismatchesBoard', () => {
  const OPENING_FEN = 'r1bq1rk1/pp2bppp/2npp3/3nP3/2BP4/5N2/PP2QPPP/RNBR2K1 b - - 7 10';
  const ENDGAME_FEN = '8/5pk1/6p1/8/3K4/6P1/5P2/8 w - - 0 40';

  it('rejects an endgame lesson on a full board', () => {
    expect(notePhaseMismatchesBoard('endgame', OPENING_FEN, 10)).toBe(true);
  });

  it('allows an endgame lesson once the queens are gone', () => {
    expect(notePhaseMismatchesBoard('endgame', ENDGAME_FEN, 60)).toBe(false);
  });

  it('leaves opening and middlegame notes alone', () => {
    expect(notePhaseMismatchesBoard('middlegame', OPENING_FEN, 10)).toBe(false);
    expect(notePhaseMismatchesBoard('opening', OPENING_FEN, 10)).toBe(false);
  });

  it('falls back to depth when no board is supplied', () => {
    expect(notePhaseMismatchesBoard('endgame', undefined, 8)).toBe(true);
    expect(notePhaseMismatchesBoard('endgame', undefined, 40)).toBe(false);
  });
});
