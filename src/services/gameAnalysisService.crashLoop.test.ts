// 🔒 THE CRASH-LOOP BREAKER (2026-11-25). A web view killed on /weaknesses
// while the batch ran relaunched and started the batch again on its own (the
// import's post-processing), so the student was stuck in a loop. A session
// after a killed one holds every AUTOMATIC batch; the student's tap still runs.
import { describe, it, expect, vi, beforeEach } from 'vitest';

let killed = false;
vi.mock('./sessionWatch', async (orig) => ({
  ...(await orig<typeof import('./sessionWatch')>()),
  lastSessionWasKilled: () => Promise.resolve(killed),
}));
const audits: { kind: string }[] = [];
vi.mock('./appAuditor', async (orig) => ({
  ...(await orig<typeof import('./appAuditor')>()),
  logAppAudit: (e: { kind: string }) => { audits.push(e); return Promise.resolve(); },
}));

import { runBackgroundAnalysis, cancelBackgroundAnalysis } from './gameAnalysisService';
import { useAppStore } from '../stores/appStore';

const flush = async (): Promise<void> => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe('runBackgroundAnalysis after a killed session', () => {
  beforeEach(() => { audits.length = 0; useAppStore.getState().setBackgroundAnalysis(false, null); });

  it('an automatic batch is held, and says so', async () => {
    killed = true;
    runBackgroundAnalysis('auto');
    await flush();
    expect(useAppStore.getState().backgroundAnalysisRunning).toBe(false);
    expect(audits.some((a) => a.kind === 'crash-loop-breaker')).toBe(true);
  });

  it('the student tapping Analyze still runs it', async () => {
    killed = true;
    runBackgroundAnalysis('user');
    expect(useAppStore.getState().backgroundAnalysisRunning).toBe(true);
    cancelBackgroundAnalysis();
  });

  it('after a clean session an automatic batch runs', async () => {
    killed = false;
    runBackgroundAnalysis('auto');
    await flush();
    expect(audits.some((a) => a.kind === 'crash-loop-breaker')).toBe(false);
  });
});
