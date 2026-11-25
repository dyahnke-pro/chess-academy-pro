// 🔒 ONE HEAVY RECORD READER AT A TIME (2026-11-25). An App Store user's web
// view was killed on /weaknesses while the batch analysis ran beside the boot
// and page backfills, all re-reading the same games. Every backfill row now
// waits while the batch runs, and after a killed session (the crash-loop
// breaker) for the whole session.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PRODUCTION_BACKFILL_SCHEDULE } from './backfillSchedule';
import { holdBackfills, backfillHoldCountForTests } from './foregroundActivity';

afterEach(() => { vi.useRealTimers(); });

describe('backfills wait while the batch analysis runs', () => {
  it('a backfill row does not proceed while a hold is live, and does once it is released', async () => {
    vi.useFakeTimers();
    const release = holdBackfills();
    let passed = false;
    void PRODUCTION_BACKFILL_SCHEDULE.yieldBetweenRows().then(() => { passed = true; });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(passed, 'a row ran beside the batch').toBe(false);
    release();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(passed).toBe(true);
  });

  it('a game re-read waits for its turn too', async () => {
    vi.useFakeTimers();
    const release = holdBackfills();
    let passed = false;
    void PRODUCTION_BACKFILL_SCHEDULE.waitForQuiet?.().then(() => { passed = true; });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(passed).toBe(false);
    release();
    expect(backfillHoldCountForTests()).toBe(0);
  });
});
