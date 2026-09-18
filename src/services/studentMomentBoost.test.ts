import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { studentMomentBoost, GREY_BOOST } from './studentMomentBoost';
import { computeImportance } from './narrationImportance';
import type { CapabilityProfile } from './capabilityEvidence';
import type { WeaknessSignal } from './weaknessSignal';

const TAG = 'ignored-opponent-threat' as never;
const caps = (e: { held: number; broken: number } | null): CapabilityProfile =>
  (e ? new Map([[TAG, e]]) : new Map()) as CapabilityProfile;

const persistentHole = {
  clusterId: 'analysis:tactic:hanging_piece', bucket: 'tactics', label: 'x',
  openCount: 6, severity: 80, lifecycleStatus: 'persistent', trend: 'worsening',
  puzzleThemes: [], total: 14,
} as unknown as WeaknessSignal;

describe('the heat map feeds the RANKER', () => {
  it('GREY raises — never asked is not mastered', () => {
    expect(studentMomentBoost({ posedTags: [TAG], capabilities: caps(null) })).toBe(GREY_BOOST);
  });

  it('GREEN earns nothing here — the ranker is raise-only, green lowers through need', () => {
    expect(studentMomentBoost({ posedTags: [TAG], capabilities: caps({ held: 9, broken: 0 }) })).toBe(0);
  });

  it('RED outranks GREY when the hole is persistent and worsening', () => {
    const red = studentMomentBoost({ hole: persistentHole, posedTags: [TAG], capabilities: caps(null) });
    expect(red).toBeGreaterThan(GREY_BOOST);
  });

  it('takes the MAX, never the sum', () => {
    const both = studentMomentBoost({ hole: persistentHole, posedTags: [TAG], capabilities: caps(null) });
    const redOnly = studentMomentBoost({ hole: persistentHole });
    expect(both).toBe(redOnly);
  });

  it('a board that asked nothing contributes nothing', () => {
    expect(studentMomentBoost({ posedTags: [], capabilities: caps(null) })).toBe(0);
  });

  /**
   * THE LOAD-BEARING ONE. "All computed teachings get spoken when there's
   * something to teach" — the converse being that a ply where NOTHING was
   * computed stays silent by having nothing, not by a gate. `computeImportance`
   * applies the student term only under `rank > 0`, so grey cannot manufacture
   * a moment out of a quiet book ply. If this ever goes green-on-a-quiet-ply,
   * the coach talks on every move of every game.
   */
  it('GREY cannot manufacture a moment out of a quiet ply', () => {
    const quiet = { decision: null, cpLossCp: null, threatNet: 0, teachingBeat: false, evalCpWhitePov: 20, wdl: null };
    const withGrey = computeImportance(quiet, 1400, GREY_BOOST);
    expect(withGrey.rank).toBe(0);
    expect(withGrey.speak).toBe(false);
  });

  it('but it DOES raise a moment that already fired', () => {
    const real = { decision: null, cpLossCp: null, threatNet: 0, teachingBeat: true, evalCpWhitePov: 20, wdl: null };
    const plain = computeImportance(real, 1400, 0);
    const boosted = computeImportance(real, 1400, GREY_BOOST);
    expect(plain.rank).toBeGreaterThan(0);
    expect(boosted.rank).toBe(plain.rank + GREY_BOOST);
  });
});

describe('the wire reaches the ranker on both lanes', () => {
  it('the selector publishes a per-ply boost', () => {
    const src = readFileSync('src/services/teachingSelector.ts', 'utf8');
    expect(src).toMatch(/boostByPly\.set\(p\.ply, studentMomentBoost\(/);
    expect(src).toMatch(/boostByPly,?\s*\}/);
  });

  it('review PASSES it — the package is kept, not reduced to needByPly', () => {
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    expect(src, 'review must pass the student term to the ranker')
      .toMatch(/momentBoost: boostByPly\.get\(m\.ply\)/);
    expect(src, 'the selector package must not be reduced to one field again')
      .not.toMatch(/\}\)\.needByPly;/);
  });
});
