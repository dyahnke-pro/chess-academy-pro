import { describe, it, expect } from 'vitest';
import { describePollyFalloverReason } from './voiceService';

// David's native TestFlight log (2026-07-31): 34 consecutive voice-fallover
// entries, every one `pollyStatus: null` and reported as "client playback
// failed (no server error)". Nothing had failed client-side — Polly was never
// attempted, because a failed boot warmup latched it off for the session.
// Mislabelling that sent the investigation hunting a decode bug that wasn't
// there, so the wording is now pinned.
describe('describePollyFalloverReason', () => {
  it('says Polly was never attempted, not that playback failed', () => {
    const reason = describePollyFalloverReason({ error: null, pollyStatus: null, pollyAttempted: false });
    expect(reason).toMatch(/never attempted/i);
    expect(reason).not.toMatch(/client playback failed/i);
  });

  it('still reports a real client playback failure when Polly WAS attempted', () => {
    expect(describePollyFalloverReason({ error: null, pollyStatus: null, pollyAttempted: true }))
      .toBe('client playback failed (no server error)');
    expect(describePollyFalloverReason({ error: null, pollyStatus: 200, pollyAttempted: true }))
      .toMatch(/client playback failed \(server ok, http 200\)/);
  });

  it('an explicit error always wins', () => {
    expect(describePollyFalloverReason({ error: 'decode blew up', pollyStatus: 500, pollyAttempted: true }))
      .toBe('decode blew up');
  });

  it('a real HTTP failure is named as one', () => {
    expect(describePollyFalloverReason({ error: null, pollyStatus: 503, pollyAttempted: true }))
      .toBe('http 503');
  });
});
