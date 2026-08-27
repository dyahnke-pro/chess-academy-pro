import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
  getBuildId: vi.fn(() => 'abc123+1'),
  getSessionId: vi.fn(() => 'sess-1'),
}));

import { submitFeedback } from './feedback';
import { logAppAudit } from './appAuditor';

beforeEach(() => vi.clearAllMocks());

describe('submitFeedback', () => {
  it('emits a feedback-submitted audit carrying category + message + reply-to', async () => {
    const ok = await submitFeedback({
      message: 'love the coach voice, more openings please',
      category: 'praise',
      source: 'QuickFeedbackButton',
      contactEmail: 'fan@example.com',
      route: '/coach/play',
      profileName: 'Dana',
    });
    expect(ok).toBe(true);
    expect(logAppAudit).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(logAppAudit).mock.calls[0][0];
    expect(arg.kind).toBe('feedback-submitted');
    expect(arg.source).toBe('QuickFeedbackButton');
    // category leads the summary so the audit-stream / alert one-liner reads clean
    expect(arg.summary).toContain('[praise]');
    expect(arg.summary).toContain('love the coach voice');
    // route is forwarded so PostHog props carry it
    expect(arg.route).toBe('/coach/play');
    // details carry the reply-to + build id for actionability
    expect(arg.details).toContain('fan@example.com');
    expect(arg.details).toContain('abc123+1');
    // AND the reply-to is forwarded as a first-class field so analytics can
    // mirror it durably to PostHog (details is NOT forwarded) — the difference
    // between "we can respond" and losing the address (David 2026-08-27).
    expect(arg.feedbackEmail).toBe('fan@example.com');
  });

  it('forwards feedbackEmail/feedbackRating only when provided (so PostHog can carry the reply-to)', async () => {
    await submitFeedback({
      message: 'ping me back', category: 'quick', source: 'QuickFeedbackButton',
      contactEmail: '  reply@me.com  ', rating: 5,
    });
    const withEmail = vi.mocked(logAppAudit).mock.calls[0][0];
    expect(withEmail.feedbackEmail).toBe('reply@me.com'); // trimmed
    expect(withEmail.feedbackRating).toBe(5);

    vi.clearAllMocks();
    await submitFeedback({ message: 'anon', category: 'quick', source: 'QuickFeedbackButton' });
    const noEmail = vi.mocked(logAppAudit).mock.calls[0][0];
    expect(noEmail.feedbackEmail).toBeUndefined();
    expect(noEmail.feedbackRating).toBeUndefined();
  });

  it('records the rating when provided and marks it absent when not', async () => {
    await submitFeedback({ message: 'a', category: 'bug', source: 'FeedbackForm', rating: 4 });
    expect(vi.mocked(logAppAudit).mock.calls[0][0].details).toContain('RATING: 4/5');

    vi.clearAllMocks();
    await submitFeedback({ message: 'b', category: 'other', source: 'FeedbackForm' });
    expect(vi.mocked(logAppAudit).mock.calls[0][0].details).toContain('RATING: (none)');
  });

  it('returns false (never throws) when the audit write fails', async () => {
    vi.mocked(logAppAudit).mockRejectedValueOnce(new Error('dexie down'));
    await expect(
      submitFeedback({ message: 'x', category: 'quick', source: 'QuickFeedbackButton' }),
    ).resolves.toBe(false);
  });
});
