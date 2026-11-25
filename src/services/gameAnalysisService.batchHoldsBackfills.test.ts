// 🔒 ONE HEAVY RECORD READER AT A TIME (2026-11-25): the batch re-reads every
// game it analyses, so while it runs every backfill waits (backfillSchedule
// rule 5). The hold is taken when a run starts and released when it ends.
import { describe, it, expect } from 'vitest';
import { runBackgroundAnalysis } from './gameAnalysisService';
import { backfillHoldCount } from './foregroundActivity';
import { useAppStore } from '../stores/appStore';

describe('the batch holds every backfill while it runs', () => {
  it('a running batch holds backfills; the hold ends with the run', async () => {
    const idle = backfillHoldCount();
    runBackgroundAnalysis('user');
    expect(useAppStore.getState().backgroundAnalysisRunning).toBe(true);
    expect(backfillHoldCount()).toBe(idle + 1);
    for (let i = 0; i < 300 && useAppStore.getState().backgroundAnalysisRunning; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(useAppStore.getState().backgroundAnalysisRunning).toBe(false);
    expect(backfillHoldCount()).toBe(idle);
  });
});
