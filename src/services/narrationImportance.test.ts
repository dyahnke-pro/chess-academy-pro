import { describe, it, expect } from 'vitest';
import { computeImportance, isContested, type ImportanceSignals } from './narrationImportance';

const quiet: ImportanceSignals = {
  decision: null, cpLossCp: null, threatNet: 0, teachingBeat: false,
  evalCpWhitePov: 20, wdl: [300, 650, 50],
};

describe('computeImportance — the four failure modes of "eval-bar movement"', () => {
  it('#1 sharp-but-flat: only move found, bar flat, yet it SPEAKS (eval-movement would be silent)', () => {
    const v = computeImportance({ ...quiet, decision: { severity: 'only-move', gapCp: 400 }, cpLossCp: 0 });
    expect(v.speak).toBe(true);
    expect(v.tier).toBe('only-move');
  });

  it('#2 decided blow-out: a 3-pawn swing in a won game is SILENT', () => {
    const v = computeImportance({ ...quiet, cpLossCp: 300, evalCpWhitePov: 800, wdl: [960, 40, 0] });
    expect(v.contested).toBe(false);
    expect(v.speak).toBe(false);
  });

  it('#3 standing threat: bar flat now, a piece hangs next move → SPEAKS (must-defend)', () => {
    const v = computeImportance({ ...quiet, threatNet: 3, cpLossCp: 0 });
    expect(v.speak).toBe(true);
    expect(v.tier).toBe('must-defend');
  });

  it('B#1 decided-but-winning: a real hang STILL speaks (must-defend bypasses the contested gate)', () => {
    // Student up a rook (won game, WDL lopsided) AND their rook hangs next move.
    // The old `if (contested)` gate silenced this; the purpose-built "consolidate
    // — don't let them punch back" beat could never fire. Losing the piece is
    // exactly what un-decides a won game, so must-defend must speak here.
    const v = computeImportance({ ...quiet, threatNet: 5, evalCpWhitePov: 800, wdl: [960, 40, 0] });
    expect(v.contested).toBe(false);   // the position IS decided…
    expect(v.speak).toBe(true);        // …yet the hang still earns voice
    expect(v.tier).toBe('must-defend');
  });

  it('B#1 guard: a mere SWING in a decided game stays silent (only must-defend bypasses)', () => {
    // The bypass is scoped to must-defend, NOT to swings — failure #2 stays fixed.
    const v = computeImportance({ ...quiet, cpLossCp: 400, threatNet: 0, evalCpWhitePov: 800, wdl: [960, 40, 0] });
    expect(v.speak).toBe(false);
  });

  it('#4 quiet lesson: nothing tactical, but a declared teaching beat SPEAKS', () => {
    const v = computeImportance({ ...quiet, teachingBeat: true });
    expect(v.speak).toBe(true);
    expect(v.tier).toBe('teaching');
  });

  it('genuine silence: quiet position, no teaching, no threat, trivial swing → silent', () => {
    const v = computeImportance({ ...quiet, cpLossCp: 30 });
    expect(v.speak).toBe(false);
    expect(v.tier).toBe('none');
  });
});

describe('computeImportance — importance is BAND-FREE (B6, 2026-09-22)', () => {
  // These two used to assert the opposite ("a 1.2-pawn swing fires for an
  // intermediate but not a beginner"). That was the rating deciding volume;
  // the FOUNDATION says it never may. Negative control: hand the bars a rating
  // band again → the first `it` fails at 900.
  it('the same swing is the same moment whoever the student is — there is no rating input', () => {
    const sig: ImportanceSignals = { ...quiet, cpLossCp: 120 };
    const v = computeImportance(sig);
    expect(v.speak).toBe(true);
    expect(v.tier).toBe('swing');
    // The function has no rating parameter to feed; the door's `rating` field
    // never reaches it.
    expect(computeImportance.length).toBeLessThanOrEqual(1);
  });

  it('the tiers are the app\'s own bands: inaccuracy is quiet, a mistake swings, a blunder is a blunder', () => {
    expect(computeImportance({ ...quiet, cpLossCp: 60 }).speak).toBe(false);      // < MISTAKE_CP
    expect(computeImportance({ ...quiet, cpLossCp: 150 }).tier).toBe('swing');    // ≥ MISTAKE_CP
    expect(computeImportance({ ...quiet, cpLossCp: 250 }).tier).toBe('swing');    // < BLUNDER_CP
    expect(computeImportance({ ...quiet, cpLossCp: 300 }).tier).toBe('blunder');  // ≥ BLUNDER_CP
  });
});

describe('computeImportance — overrides, gate, and ranking', () => {
  it('a forced mate outranks everything, decided-gate or not', () => {
    const v = computeImportance({ ...quiet, evalCpWhitePov: 100000, wdl: [1000, 0, 0] });
    expect(v.speak).toBe(true);
    expect(v.tier).toBe('mate');
    expect(v.rank).toBe(100);
  });

  it('decided game demotes a teaching beat to the convert beat', () => {
    const v = computeImportance({ ...quiet, teachingBeat: true, evalCpWhitePov: 800, wdl: [960, 40, 0] });
    expect(v.speak).toBe(true);
    expect(v.tier).toBe('convert');
  });

  it('the dominant tier leads: a blunder outranks a coincident teaching beat', () => {
    const v = computeImportance({ ...quiet, cpLossCp: 300, teachingBeat: true });
    expect(v.tier).toBe('blunder');
    expect(v.reasons.length).toBeGreaterThan(1); // both fired; blunder leads
  });

  it('an only-move outranks a coincident must-defend', () => {
    const v = computeImportance({ ...quiet, decision: { severity: 'only-move', gapCp: 400 }, threatNet: 3 });
    expect(v.tier).toBe('only-move');
  });
});

describe('isContested', () => {
  it('lopsided WDL is decided', () => {
    expect(isContested(800, [960, 40, 0])).toBe(false);
    expect(isContested(-800, [0, 40, 960])).toBe(false);
  });
  it('a balanced WDL is contested', () => {
    expect(isContested(40, [300, 650, 50])).toBe(true);
  });
  it('falls back to eval magnitude when WDL is absent', () => {
    expect(isContested(700, null)).toBe(false);
    expect(isContested(200, null)).toBe(true);
  });
  it('unknown data is treated as contested — never silence on missing data', () => {
    expect(isContested(null, null)).toBe(true);
  });
});

describe('standingDanger — the carve-out that used to live outside the door', () => {
  const quiet = {
    decision: null, cpLossCp: null, threatNet: 0, teachingBeat: false,
    evalCpWhitePov: 0, wdl: null,
  } as const;

  it('speaks on a quiet board when a standing danger was found', () => {
    expect(computeImportance({ ...quiet }).speak).toBe(false);
    const v = computeImportance({ ...quiet, standingDanger: true });
    expect(v.speak).toBe(true);
    expect(v.tier).toBe('must-defend');
    expect(v.reasons.join(' ')).toMatch(/standing danger/i);
  });

  it('is NOT gated by the contested test — a pin aimed at your king is most dangerous when the eval looks settled', () => {
    // A thoroughly decided game: every contested-gated signal goes quiet here.
    const decided = { ...quiet, evalCpWhitePov: 1200, wdl: [980, 15, 5] as const };
    expect(computeImportance({ ...decided, cpLossCp: 400 }).tier).not.toBe('blunder');
    expect(computeImportance({ ...decided, standingDanger: true }).speak).toBe(true);
  });

  it('ranks just under a live hang — that one is now, this one is next move', () => {
    const hang = computeImportance({ ...quiet, threatNet: 5 });
    const standing = computeImportance({ ...quiet, standingDanger: true });
    expect(standing.rank).toBeLessThan(hang.rank);
    expect(standing.rank).toBeGreaterThan(0);
  });

  it('a surface that runs no such probe is unaffected', () => {
    expect(computeImportance({ ...quiet, standingDanger: false }).speak).toBe(false);
    expect(computeImportance({ ...quiet }).rank).toBe(computeImportance({ ...quiet, standingDanger: false }).rank);
  });
});
