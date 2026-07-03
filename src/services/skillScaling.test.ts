import { describe, it, expect } from 'vitest';
import { alertSensitivityMultiplier, hintStartTier, wrongTriesBeforeHint } from './skillScaling';

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
