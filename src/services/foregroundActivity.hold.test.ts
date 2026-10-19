import { describe, it, expect, beforeEach } from 'vitest';
import { holdBackground, waitForForegroundQuiet, waitWhileHeld, backgroundHolds, __resetForegroundActivityForTests } from './foregroundActivity';
import { holdBatchAnalysis } from './gameAnalysisService';

describe('a Learn game holds every background pass (David 2026-10-19: "not while playing a chess game in learn")', () => {
  beforeEach(() => __resetForegroundActivityForTests());

  it('the quiet wait does not resolve while a hold is live, however long the student thinks', async () => {
    const release = holdBackground();
    let slept = 0;
    let done = false;
    const sleep = async (): Promise<void> => { slept += 1; if (slept === 5) release(); };
    await waitForForegroundQuiet(20_000, sleep).then(() => { done = true; });
    expect(done).toBe(true);
    expect(slept).toBeGreaterThanOrEqual(5);
  });

  it('per-row waits hold too, and a release frees only its own hold', async () => {
    const a = holdBackground();
    const b = holdBatchAnalysis();
    expect(backgroundHolds()).toBe(2);
    a(); a();
    expect(backgroundHolds()).toBe(1);
    let n = 0;
    await waitWhileHeld(async () => { n += 1; if (n === 3) b(); });
    expect(n).toBe(3);
    expect(backgroundHolds()).toBe(0);
  });

  it('NEGATIVE: with no hold the wait returns at once', async () => {
    let n = 0;
    await waitWhileHeld(async () => { n += 1; });
    expect(n).toBe(0);
  });
});
