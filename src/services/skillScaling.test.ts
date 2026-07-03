import { describe, it, expect } from 'vitest';
import { alertSensitivityMultiplier } from './skillScaling';

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
