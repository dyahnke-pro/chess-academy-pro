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

describe('computeImportance — importance is rating-RELATIVE', () => {
  it('a 1.2-pawn swing fires for an intermediate but not a beginner', () => {
    const sig: ImportanceSignals = { ...quiet, cpLossCp: 120 };
    expect(computeImportance(sig, 1500).speak).toBe(true);   // critical bar 100
    expect(computeImportance(sig, 900).speak).toBe(false);   // beginner bar 200 — only blunders
  });

  it('a 0.6-pawn subtlety fires for an expert', () => {
    const sig: ImportanceSignals = { ...quiet, cpLossCp: 60 };
    expect(computeImportance(sig, 2200).speak).toBe(true);   // expert bar 50
    expect(computeImportance(sig, 1500).speak).toBe(false);  // intermediate bar 100
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
