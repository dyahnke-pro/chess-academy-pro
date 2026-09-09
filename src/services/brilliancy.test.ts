import { describe, it, expect } from 'vitest';
import { detectBrilliancy, describeBrilliancy } from './brilliancy';

// 🔒 David 2026-09-09: "Make sure we follow the same rules as chess.com for
// brilliant moves." chess.com Brilliant (!!) = a MATERIAL SACRIFICE that is
// best/near-best, stays favourable, and is NOT played while already winning.
// This gate proves the detector matches those rules — and, critically, that the
// things chess.com does NOT call brilliant (only-move, non-sac mate, unsound
// sac, cleanup while crushing) are rejected.

// A real net sacrifice: Qxh7+ hands the queen for a pawn (king recaptures).
const SAC_FEN = '6k1/5ppp/8/7Q/8/8/8/6K1 w - - 0 1';
const SAC_SAN = 'Qxh7+';

describe('detectBrilliancy — chess.com Brilliant (!!) rules', () => {
  it('SACRIFICE + best + favourable + not-already-winning → brilliant', () => {
    const b = detectBrilliancy({
      isBest: true, cpLossFromBestCp: 0, evalBeforeStudentCp: 40,
      evalAfterStudentCp: 250, postForcedMateForStudent: false,
      fenBefore: SAC_FEN, san: SAC_SAN,
    });
    expect(b.brilliant).toBe(true);
    expect(b.sacrificePhrase).toMatch(/sacrifices the queen on h7/);
  });

  it('NO SACRIFICE is never brilliant — an "only move" (2nd-best far worse) is great/best, not !!', () => {
    const b = detectBrilliancy({
      isBest: true, cpLossFromBestCp: 0, evalBeforeStudentCp: 20,
      evalAfterStudentCp: 60, postForcedMateForStudent: false,
      // no fenBefore/san → no sacrifice detectable
    });
    expect(b.brilliant).toBe(false);
  });

  it('a forced MATE without a sacrifice is NOT brilliant (chess.com: great/best)', () => {
    const b = detectBrilliancy({
      isBest: true, cpLossFromBestCp: 0, evalBeforeStudentCp: 100,
      evalAfterStudentCp: null, postForcedMateForStudent: true,
      // no sac
    });
    expect(b.brilliant).toBe(false);
  });

  it('UNSOUND SAC is NOT brilliant — the eval tanks after (a blunder, not !!)', () => {
    const b = detectBrilliancy({
      isBest: true, cpLossFromBestCp: 0, evalBeforeStudentCp: 30,
      evalAfterStudentCp: -300, postForcedMateForStudent: false,
      fenBefore: SAC_FEN, san: SAC_SAN,
    });
    expect(b.brilliant).toBe(false);
  });

  it('a SAC while ALREADY WINNING is NOT brilliant — cleanup is great/best (chess.com)', () => {
    const b = detectBrilliancy({
      isBest: true, cpLossFromBestCp: 0, evalBeforeStudentCp: 600,
      evalAfterStudentCp: 900, postForcedMateForStudent: false,
      fenBefore: SAC_FEN, san: SAC_SAN,
    });
    expect(b.brilliant).toBe(false); // already crushing before the sac
  });

  it('a SAC that is NOT best/near-best is not brilliant (gave up too much vs the engine)', () => {
    const b = detectBrilliancy({
      isBest: false, cpLossFromBestCp: 120, evalBeforeStudentCp: 20,
      evalAfterStudentCp: 150, postForcedMateForStudent: false,
      fenBefore: SAC_FEN, san: SAC_SAN,
    });
    expect(b.brilliant).toBe(false);
  });
});

describe('describeBrilliancy — the grounded WHY', () => {
  it('names the sacrifice and asserts soundness', () => {
    const b = detectBrilliancy({
      isBest: true, cpLossFromBestCp: 0, evalBeforeStudentCp: 40,
      evalAfterStudentCp: 250, postForcedMateForStudent: false,
      fenBefore: SAC_FEN, san: SAC_SAN,
    });
    const why = describeBrilliancy(b, SAC_SAN);
    expect(why).toContain(SAC_SAN);
    expect(why).toMatch(/sacrifice/i);
  });
  it('returns null for a non-brilliancy (no praise-filler)', () => {
    expect(describeBrilliancy({ brilliant: false, sacrificePhrase: null }, 'e4')).toBeNull();
  });
});
