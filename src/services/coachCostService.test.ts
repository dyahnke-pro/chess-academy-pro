import { describe, it, expect, beforeEach, vi } from 'vitest';
import { estimateCost, recordApiUsage, getBudgetStatus } from './coachCostService';
import { db } from '../db/schema';
import { buildUserProfile } from '../test/factories';

describe('coachCostService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    vi.restoreAllMocks();
  });

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

    it('calculates cost for Opus model', () => {
      const cost = estimateCost('claude-opus-4-5-20250514', 1000, 500);
      // 1000 * 0.000015 + 500 * 0.000075 = 0.015 + 0.0375 = 0.0525
      expect(cost).toBeCloseTo(0.0525);
    });

    it('returns 0 for unknown model', () => {
      const cost = estimateCost('unknown-model', 1000, 500);
      expect(cost).toBe(0);
    });

    it('returns 0 when token counts are 0', () => {
      const cost = estimateCost('claude-haiku-4-5-20251001', 0, 0);
      expect(cost).toBe(0);
    });

    it('handles large token counts correctly', () => {
      const cost = estimateCost('claude-haiku-4-5-20251001', 100000, 50000);
      // 100000 * 0.0000008 + 50000 * 0.000004 = 0.08 + 0.2 = 0.28
      expect(cost).toBeCloseTo(0.28);
    });
  });

  describe('recordApiUsage', () => {
    it('writes usage entry to meta table', async () => {
      const profile = buildUserProfile({ id: 'main', preferences: { estimatedSpend: 0 } });
      await db.profiles.put(profile);

      await recordApiUsage('move_commentary', 'claude-haiku-4-5-20251001', 100, 20);

      const allMeta = await db.meta.toArray();
      const usageEntries = allMeta.filter((m) => m.key.startsWith('api_usage_'));
      expect(usageEntries).toHaveLength(1);

      const entry = JSON.parse(usageEntries[0].value);
      expect(entry.task).toBe('move_commentary');
      expect(entry.model).toBe('claude-haiku-4-5-20251001');
      expect(entry.inputTokens).toBe(100);
      expect(entry.outputTokens).toBe(20);
      expect(entry.estimatedCost).toBeGreaterThan(0);
    });

    it('updates estimated spend on the profile', async () => {
      const profile = buildUserProfile({ id: 'main', preferences: { estimatedSpend: 0.05 } });
      await db.profiles.put(profile);

      await recordApiUsage('hint', 'claude-sonnet-4-5-20250514', 200, 100);

      const updated = await db.profiles.get('main');
      expect(updated?.preferences.estimatedSpend).toBeGreaterThan(0.05);
    });

    it('accumulates spend across multiple recordings', async () => {
      const profile = buildUserProfile({ id: 'main', preferences: { estimatedSpend: 0 } });
      await db.profiles.put(profile);

      await recordApiUsage('hint', 'claude-haiku-4-5-20251001', 100, 50);
      await recordApiUsage('analysis', 'claude-haiku-4-5-20251001', 100, 50);

      const updated = await db.profiles.get('main');
      const singleCost = estimateCost('claude-haiku-4-5-20251001', 100, 50);
      expect(updated?.preferences.estimatedSpend).toBeCloseTo(singleCost * 2);
    });

    it('does not throw when no profile exists', async () => {
      // No profile in DB — recordApiUsage should still write to meta without error
      await expect(
        recordApiUsage('hint', 'claude-haiku-4-5-20251001', 100, 50),
      ).resolves.not.toThrow();

      const allMeta = await db.meta.toArray();
      expect(allMeta.filter((m) => m.key.startsWith('api_usage_'))).toHaveLength(1);
    });
  });

  describe('getBudgetStatus', () => {
    it('returns defaults when no profile exists', async () => {
      const status = await getBudgetStatus();
      expect(status).toEqual({
        spent: 0,
        cap: null,
        percentUsed: 0,
        isOverBudget: false,
        isNearBudget: false,
      });
    });

    it('returns no cap status when monthlyBudgetCap is null', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: { estimatedSpend: 1.50, monthlyBudgetCap: null },
      });
      await db.profiles.put(profile);

      const status = await getBudgetStatus();
      expect(status.spent).toBeCloseTo(1.50);
      expect(status.cap).toBeNull();
      expect(status.percentUsed).toBe(0);
      expect(status.isOverBudget).toBe(false);
      expect(status.isNearBudget).toBe(false);
    });

    it('returns no cap status when monthlyBudgetCap is 0', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: { estimatedSpend: 0.50, monthlyBudgetCap: 0 },
      });
      await db.profiles.put(profile);

      const status = await getBudgetStatus();
      expect(status.cap).toBeNull();
      expect(status.isOverBudget).toBe(false);
    });

    it('reports near budget at 80% threshold', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: { estimatedSpend: 8.0, monthlyBudgetCap: 10.0 },
      });
      await db.profiles.put(profile);

      const status = await getBudgetStatus();
      expect(status.spent).toBeCloseTo(8.0);
      expect(status.cap).toBe(10.0);
      expect(status.percentUsed).toBeCloseTo(80);
      expect(status.isNearBudget).toBe(true);
      expect(status.isOverBudget).toBe(false);
    });

    it('reports near budget at 90% usage', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: { estimatedSpend: 9.0, monthlyBudgetCap: 10.0 },
      });
      await db.profiles.put(profile);

      const status = await getBudgetStatus();
      expect(status.percentUsed).toBeCloseTo(90);
      expect(status.isNearBudget).toBe(true);
      expect(status.isOverBudget).toBe(false);
    });

    it('reports over budget at 100% cap', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: { estimatedSpend: 10.0, monthlyBudgetCap: 10.0 },
      });
      await db.profiles.put(profile);

      const status = await getBudgetStatus();
      expect(status.percentUsed).toBeCloseTo(100);
      expect(status.isOverBudget).toBe(true);
      expect(status.isNearBudget).toBe(false);
    });

    it('reports over budget when spend exceeds cap', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: { estimatedSpend: 15.0, monthlyBudgetCap: 10.0 },
      });
      await db.profiles.put(profile);

      const status = await getBudgetStatus();
      expect(status.percentUsed).toBeCloseTo(150);
      expect(status.isOverBudget).toBe(true);
      expect(status.isNearBudget).toBe(false);
    });

    it('reports not near budget when under 80%', async () => {
      const profile = buildUserProfile({
        id: 'main',
        preferences: { estimatedSpend: 3.0, monthlyBudgetCap: 10.0 },
      });
      await db.profiles.put(profile);

      const status = await getBudgetStatus();
      expect(status.percentUsed).toBeCloseTo(30);
      expect(status.isNearBudget).toBe(false);
      expect(status.isOverBudget).toBe(false);
    });
  });
});
