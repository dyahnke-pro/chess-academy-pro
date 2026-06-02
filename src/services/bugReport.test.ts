import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
  getAppAuditLog: vi.fn(() =>
    Promise.resolve([
      { timestamp: 1, kind: 'tts-failure', category: 'subsystem', summary: 'polly 500', source: 'voiceService' },
      { timestamp: 2, kind: 'continuity-error', category: 'app', summary: 'illegal move', source: 'PlayableLinePlayer' },
    ]),
  ),
  getBuildId: vi.fn(() => 'abc123+1'),
  getSessionId: vi.fn(() => 'sess-1'),
}));

import { submitBugReport } from './bugReport';
import { logAppAudit, getAppAuditLog } from './appAuditor';

beforeEach(() => vi.clearAllMocks());

describe('submitBugReport', () => {
  it('emits a user-report audit carrying the note + recent issue context', async () => {
    const ok = await submitBugReport('the coach said the knight was pinned but there was no knight');
    expect(ok).toBe(true);
    expect(logAppAudit).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(logAppAudit).mock.calls[0][0];
    expect(arg.kind).toBe('user-report');
    expect(arg.source).toBe('BugReportPanel');
    expect(arg.summary).toContain('coach said the knight');
    // recent app/runtime issues are attached for actionability
    expect(arg.details).toContain('continuity-error');
    expect(arg.details).toContain('abc123+1'); // build id
  });

  it('only includes runtime/app issues in the recent context (not every kind)', async () => {
    await submitBugReport('x');
    const arg = vi.mocked(logAppAudit).mock.calls[0][0];
    // tts-failure is category 'subsystem' → excluded from RECENT ISSUES
    expect(arg.details).not.toMatch(/RECENT ISSUES:[\s\S]*tts-failure/);
  });

  it('returns false (never throws) when the audit write fails', async () => {
    vi.mocked(getAppAuditLog).mockResolvedValueOnce([]);
    vi.mocked(logAppAudit).mockRejectedValueOnce(new Error('dexie down'));
    await expect(submitBugReport('note')).resolves.toBe(false);
  });
});
