import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  getAnalysisPracticeStats,
  recordReadingResult,
  weakestCategory,
} from './analysisPracticeStats';

beforeEach(async () => {
  await db.meta.clear();
});

describe('analysisPracticeStats', () => {
  it('starts empty', async () => {
    expect(await getAnalysisPracticeStats()).toEqual({});
  });

  it('accumulates asked/correct per category across calls', async () => {
    await recordReadingResult('hanging', true);
    await recordReadingResult('hanging', false);
    await recordReadingResult('tactic', true);
    const stats = await getAnalysisPracticeStats();
    expect(stats.hanging).toEqual({ asked: 2, correct: 1 });
    expect(stats.tactic).toEqual({ asked: 1, correct: 1 });
  });

  it('persists across reads (durable in meta)', async () => {
    await recordReadingResult('pawn-break', false);
    const a = await getAnalysisPracticeStats();
    const b = await getAnalysisPracticeStats();
    expect(a).toEqual(b);
    expect(b['pawn-break']).toEqual({ asked: 1, correct: 0 });
  });

  it('weakestCategory ignores thin samples and picks the lowest accuracy', async () => {
    // hanging: 1/4 = 0.25 (4 samples), tactic: 3/4 = 0.75, piece: 0/2 (too thin)
    for (const ok of [true, false, false, false]) await recordReadingResult('hanging', ok);
    for (const ok of [true, true, true, false]) await recordReadingResult('tactic', ok);
    await recordReadingResult('piece', false);
    await recordReadingResult('piece', false);
    const stats = await getAnalysisPracticeStats();
    const weak = weakestCategory(stats);
    expect(weak?.type).toBe('hanging');
    expect(weak?.accuracy).toBeCloseTo(0.25);
  });

  it('weakestCategory returns null when no category has enough data', async () => {
    await recordReadingResult('mate', false);
    expect(weakestCategory(await getAnalysisPracticeStats())).toBeNull();
  });

  it('survives a corrupt meta value', async () => {
    await db.meta.put({ key: 'analysis-practice-stats.v1', value: 'not json' });
    expect(await getAnalysisPracticeStats()).toEqual({});
  });
});
