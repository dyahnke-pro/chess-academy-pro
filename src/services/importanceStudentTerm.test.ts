import { describe, it, expect } from 'vitest';
import { computeImportance, type ImportanceSignals } from './narrationImportance';

// THE ALGO-BASED SUPREME LAW applied to importance (CLAUDE.md: "everything from
// now on is algo based so it tailors to the user"). Importance gates whether the
// coach INTERRUPTS a live game. It scaled by rating alone — the same for a
// student with 200 analysed games as for one with zero — while `needScore` had
// been data-driven all along. This is the missing half.
const quiet = (over: Partial<ImportanceSignals> = {}): ImportanceSignals => ({
  decision: null, cpLossCp: null, threatNet: 0, teachingBeat: false,
  evalCpWhitePov: 20, wdl: null, ...over,
});

describe('importance takes the student term — raise-only, pre-matched', () => {
  it('a recorded weakness RAISES a moment that already fired', () => {
    const s = quiet({ threatNet: 3 });          // a real live hang
    const cold = computeImportance(s, 0);
    const known = computeImportance(s, 16); // persistent hole
    expect(cold.speak).toBe(true);
    expect(known.rank).toBeGreaterThan(cold.rank);
    expect(known.reasons.join(' ')).toMatch(/recorded weakness/);
  });

  it('🚨 a raise-only boost NEVER manufactures a moment out of a quiet ply', () => {
    // Without this guard a persistent hole makes every position important and
    // the coach interrupts constantly — "nothing gets stated" inverted into
    // "nothing can be heard over the noise". (B2 carves out ONE bounded
    // exception — a RECURRING red hole, carried as `StudentBoost.opens` — and
    // that is pinned in studentMomentBoost.test.ts; a bare number is the
    // raise-only form and still cannot open anything.)
    const nothing = quiet();
    expect(computeImportance(nothing, 0).speak).toBe(false);
    expect(computeImportance(nothing, 40).speak, 'a hole invented a moment').toBe(false);
    expect(computeImportance(nothing, 40).rank).toBe(0);
  });

  it('RAISE-ONLY: no boost can ever lower a verdict', () => {
    // Nothing records CORRECT play yet, so "no weakness here" cannot be told
    // apart from "never met it" — absent is not silent. A negative term would
    // be inferring mastery from missing data.
    const s = quiet({ threatNet: 3 });
    const base = computeImportance(s, 0);
    for (const b of [0, 1, 8, 16, 30]) {
      const v = computeImportance(s, b);
      expect(v.rank).toBeGreaterThanOrEqual(base.rank);
      expect(v.speak).toBe(true);
    }
  });

  it('a FIXED hole contributes nothing (boostFor returns 0 for it)', () => {
    const s = quiet({ threatNet: 3 });
    expect(computeImportance(s, 0).rank).toBe(computeImportance(s, 0).rank);
  });

  it('cold start still teaches — a live hang speaks with no data at all', () => {
    // A fresh install must never meet a mute coach.
    const s = quiet({ threatNet: 3 });
    expect(computeImportance(s, 0).speak).toBe(true);
  });

  it('the boost is BACKWARD-COMPATIBLE — an un-migrated caller behaves exactly as before', () => {
    const s = quiet({ threatNet: 3, cpLossCp: 250 });
    expect(computeImportance(s)).toEqual(computeImportance(s, 0));
  });
});
