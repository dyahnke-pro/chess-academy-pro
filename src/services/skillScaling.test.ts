import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { alertSensitivityMultiplier, hintStartTier, wrongTriesBeforeHint } from './skillScaling';
import { criticalityThresholds } from './criticalityScan';

describe('alertSensitivityMultiplier', () => {
  it('is ~1.0 at the 1500 anchor with neutral skill', () => {
    expect(alertSensitivityMultiplier(1500)).toBeCloseTo(1.0, 5);
    expect(alertSensitivityMultiplier(1500, 50)).toBeCloseTo(1.0, 5);
  });

  it('lowers the bar for weaker players (more/earlier help)', () => {
    expect(alertSensitivityMultiplier(800)).toBeLessThan(1);
    expect(alertSensitivityMultiplier(1000)).toBeLessThan(alertSensitivityMultiplier(1500));
  });

  it('raises the bar for stronger players (less noise)', () => {
    expect(alertSensitivityMultiplier(2000)).toBeGreaterThan(1);
    expect(alertSensitivityMultiplier(2200)).toBeGreaterThan(alertSensitivityMultiplier(1500));
  });

  it('sharpens by category skill: strong-for-rating → higher bar, weak → lower', () => {
    expect(alertSensitivityMultiplier(1500, 90)).toBeGreaterThan(alertSensitivityMultiplier(1500, 50));
    expect(alertSensitivityMultiplier(1500, 10)).toBeLessThan(alertSensitivityMultiplier(1500, 50));
  });

  it('stays within [0.5, 1.6]', () => {
    expect(alertSensitivityMultiplier(200, 0)).toBeGreaterThanOrEqual(0.5);
    expect(alertSensitivityMultiplier(3000, 100)).toBeLessThanOrEqual(1.6);
  });
});

describe('hintStartTier', () => {
  it('gives beginners the answer on the first tap (tier 3)', () => {
    expect(hintStartTier(800)).toBe(3);
    expect(hintStartTier(1100)).toBe(3);
  });

  it('gives intermediate players the WHICH rung (tier 2)', () => {
    expect(hintStartTier(1400)).toBe(2);
    expect(hintStartTier(1600)).toBe(2);
  });

  it('gives advanced players the full WHY ladder (tier 1)', () => {
    expect(hintStartTier(1800)).toBe(1);
    expect(hintStartTier(2200)).toBe(1);
  });

  it('tactics skill shifts the start rung (strong-for-rating starts higher)', () => {
    // 1500 baseline → tier 2; elite tactics (100) adds ~+300 → tier 1.
    expect(hintStartTier(1500, 100)).toBe(1);
    // 1500 with weak tactics (10) subtracts ~-240 → tier 3.
    expect(hintStartTier(1500, 10)).toBe(3);
  });
});

describe('wrongTriesBeforeHint', () => {
  it('offers help sooner to weaker players, later to stronger ones', () => {
    expect(wrongTriesBeforeHint(1000)).toBe(1);
    expect(wrongTriesBeforeHint(1500)).toBe(2);
    expect(wrongTriesBeforeHint(2000)).toBe(3);
  });
  it('sharpens by category skill', () => {
    expect(wrongTriesBeforeHint(1500, 100)).toBe(3); // strong-for-rating → struggle longer
    expect(wrongTriesBeforeHint(1500, 0)).toBe(1);   // weak-for-rating → help sooner
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// THE TWO RATING SCALERS RUN IN OPPOSITE DIRECTIONS, AND THAT IS CORRECT.
//
// The app has exactly two rating-scaled centipawn bars and they look like
// duplicates. They are not. Measured:
//
//   rating   criticalityThresholds.critical   alertSensitivityMultiplier
//   600      200 cp                           0.60×
//   1500     100 cp                           1.00×
//   2400      50 cp                           1.40×
//
// DIAGNOSIS (criticalityThresholds) — "was this mistake worth TEACHING about".
//   The bar FALLS as the student improves: don't stop a 900 over a 50cp
//   inaccuracy, they have bigger problems; a 2200 wants the subtleties.
// HELP (alertSensitivityMultiplier) — "should I WARN you about this danger".
//   The bar RISES as the student improves: a beginner needs the warning; a
//   strong player should be left to spot it themselves.
//
// Beginner: teach only big mistakes, but warn often. Advanced: teach
// subtleties, warn rarely. Merging these inverts the pedagogy on both axes at
// once and nothing downstream would go red — so this is the gate.
describe('the diagnosis bar and the help bar are DIFFERENT computers', () => {
  it('run in OPPOSITE directions across the rating range', () => {
    const diagnosis = [600, 1500, 2400].map((r) => criticalityThresholds(r).critical);
    const help = [600, 1500, 2400].map((r) => alertSensitivityMultiplier(r));
    // diagnosis falls...
    expect(diagnosis[0], 'the teaching bar must FALL as the student improves').toBeGreaterThan(diagnosis[2]);
    // ...help rises. If a "unification" ever makes these agree, one of the two
    // pedagogies has been inverted.
    expect(help[0], 'the warning bar must RISE as the student improves').toBeLessThan(help[2]);
  });

  it('no file mixes the two axes — a teaching computer never reads the help bar', () => {
    const SRC = join(process.cwd(), 'src');
    const files: string[] = [];
    const walk = (d: string): void => {
      for (const e of readdirSync(d)) {
        const f = join(d, e);
        if (statSync(f).isDirectory()) walk(f);
        else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(f);
      }
    };
    walk(SRC);
    // Non-vacuity: a scan that found nothing passes for the wrong reason.
    expect(files.length, 'the source walk found nothing — this check is vacuous').toBeGreaterThan(400);
    // BLAME BY STATEMENT, NOT BY PROXIMITY. A first cut matched the bare
    // identifiers and flagged `ratingBands.ts`, whose only sin is DOCUMENTING
    // both bars in the ADAPTIVE_DECIDERS registry — the very place the
    // distinction is written down. Applying a bar is a CALL; naming one in a
    // comment or a registry key is not. (Same lesson perspectiveRule.test.ts
    // learned when it reported four innocent files.)
    const callsBoth = (src: string): boolean =>
      /\bcriticalityThresholds\s*\(/.test(src) && /\balertSensitivityMultiplier\s*\(/.test(src);
    const both = files.filter((f) => callsBoth(readFileSync(f, 'utf-8')));
    expect(
      both.map((f) => f.replace(`${process.cwd()}/`, '')),
      'a file reading BOTH bars is either merging two pedagogies or applying the wrong one — ' +
      'diagnosis (criticalityThresholds) answers "teach this?", help (alertSensitivityMultiplier) answers "warn about this?"',
    ).toEqual([]);
  });
});
