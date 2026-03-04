import { describe, it, expect } from 'vitest';
import { estimateCost } from './coachCostService';

describe('coachCostService', () => {
  describe('estimateCost', () => {
    it('calculates cost for Haiku model', () => {
      const cost = estimateCost('claude-haiku-4-5-20251001', 1000, 500);
      // 1000 * 0.0000008 + 500 * 0.000004 = 0.0008 + 0.002 = 0.0028
      expect(cost).toBeCloseTo(0.0028);
    });

    it('calculates cost for Sonnet model', () => {
      const cost = estimateCost('claude-sonnet-4-5-20250514', 1000, 500);
      // 1000 * 0.000003 + 500 * 0.000015 = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105);
    });

    it('returns 0 for unknown model', () => {
      const cost = estimateCost('unknown-model', 1000, 500);
      expect(cost).toBe(0);
    });
  });
});
