import { describe, it, expect } from 'vitest';
import { detectBrilliancy, describeBrilliancy } from './brilliancy';

// 🔒 David 2026-09-09: "Can the app answer why a move was brilliant? And can it
// identify brilliant moves?" A true brilliancy is the BEST/ONLY move that
// SACRIFICES material and is NOT losing (chess.com "!!"). This gate proves the
// single-source-of-truth detector identifies each kind and, crucially, does NOT
// call an opponent-blunder-grab or an unsound "sac" brilliant.

// A real net sacrifice: Qxh7+ hands the queen for a pawn (king recaptures).
const SAC_FEN = '6k1/5ppp/8/7Q/8/8/8/6K1 w - - 0 1';
const SAC_SAN = 'Qxh7+';

describe('detectBrilliancy — identifies a true brilliancy, rejects the impostors', () => {
  it('SACRIFICE: best + not-losing + net material given → brilliant (sacrifice)', () => {
    const b = detectBrilliancy({
      isBest: true, evalAfterStudentCp: 250, postForcedMateForStudent: false,
      onlyMoveGapCp: null, fenBefore: SAC_FEN, san: SAC_SAN,
    });
    expect(b.brilliant).toBe(true);
    expect(b.kind).toBe('sacrifice');
    expect(b.sacrificePhrase).toMatch(/sacrifices the queen on h7/);
  });

  it('ONLY-MOVE: best + not-losing + 2nd-best far worse (no sac) → brilliant (only-move)', () => {
    const b = detectBrilliancy({
      isBest: true, evalAfterStudentCp: 60, postForcedMateForStudent: false,
      onlyMoveGapCp: 220,
    });
    expect(b.brilliant).toBe(true);
    expect(b.kind).toBe('only-move');
  });

  it('MATE: best + forced mate for the student (no sac) → brilliant (mate)', () => {
    const b = detectBrilliancy({
      isBest: true, evalAfterStudentCp: null, postForcedMateForStudent: true,
      onlyMoveGapCp: null,
    });
    expect(b.brilliant).toBe(true);
    expect(b.kind).toBe('mate');
  });

  it('UNSOUND SAC is NOT brilliant — the move loses material and the eval tanks', () => {
    const b = detectBrilliancy({
      isBest: true, evalAfterStudentCp: -300, postForcedMateForStudent: false,
      onlyMoveGapCp: null, fenBefore: SAC_FEN, san: SAC_SAN,
    });
    expect(b.brilliant).toBe(false); // not-losing floor rejects it
  });

  it('NOT THE BEST MOVE is never brilliant — grabbing the swing after a blunder is not "!!"', () => {
    const b = detectBrilliancy({
      isBest: false, evalAfterStudentCp: 900, postForcedMateForStudent: false,
      onlyMoveGapCp: 400, fenBefore: SAC_FEN, san: SAC_SAN,
    });
    expect(b.brilliant).toBe(false);
  });

  it('a quiet best move with a close 2nd-best is NOT brilliant (just best)', () => {
    const b = detectBrilliancy({
      isBest: true, evalAfterStudentCp: 40, postForcedMateForStudent: false,
      onlyMoveGapCp: 30,
    });
    expect(b.brilliant).toBe(false);
  });
});

describe('describeBrilliancy — the grounded WHY the coach voices', () => {
  it('names the sacrifice and asserts soundness (best move)', () => {
    const b = detectBrilliancy({
      isBest: true, evalAfterStudentCp: 250, postForcedMateForStudent: false,
      onlyMoveGapCp: null, fenBefore: SAC_FEN, san: SAC_SAN,
    });
    const why = describeBrilliancy(b, SAC_SAN);
    expect(why).toContain(SAC_SAN);
    expect(why).toMatch(/sacrifice/i);
  });
  it('returns null for a non-brilliancy — the coach stays silent, no praise-filler', () => {
    expect(describeBrilliancy({ brilliant: false, kind: null, sacrificePhrase: null }, 'e4')).toBeNull();
  });
});
