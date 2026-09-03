// The import funnel must be diagnosable, and must not leak the username.
//
// 🚨 WHY. 32 native App Store users reached the import screen and 6 completed an
// import — an 81% drop on the single step the product's whole pitch rests on —
// and the failure path emitted NOTHING. `setError` was called and that was it,
// so a blank box, a typo'd handle, a rate limit and an outage were all the same
// invisible non-event. You could see the drop and never learn its cause.
//
// The second half matters as much as the first: an import error can echo the
// user's handle on chess.com or Lichess back in its message. That is their
// identity on another service and it must never be shipped to analytics, so the
// failure is reported as a CLASS and the raw message stays local.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, 'ImportPage.tsx'), 'utf8');

describe('import funnel instrumentation', () => {
  it('emits an event at every exit from the import attempt', () => {
    for (const evt of ['import_blocked', 'import_started', 'import_succeeded', 'import_failed']) {
      expect(SRC, `ImportPage no longer emits ${evt}`).toContain(`captureEvent('${evt}'`);
    }
  });

  it('never sends the username or the raw error message to analytics', () => {
    // Every captureEvent payload in the file, checked for identity leakage.
    const calls = SRC.match(/captureEvent\([^;]*?\);/gs) ?? [];
    expect(calls.length, 'no captureEvent calls found — did the file move?').toBeGreaterThan(0);
    for (const call of calls) {
      expect(call, `a captureEvent payload references the username: ${call}`).not.toMatch(/\busername\b\s*[,:)]/);
      expect(call, `a captureEvent payload ships a raw error: ${call}`).not.toMatch(/err\.message|String\(err/);
    }
  });

  it('classifies failures into buckets rather than passing the message through', () => {
    expect(SRC).toContain('error_class');
    // The buckets that distinguish "they typed it wrong" from "we were down" —
    // the whole point of the instrumentation.
    for (const bucket of ['user-not-found', 'rate-limited', 'network']) {
      expect(SRC, `errorClass no longer distinguishes ${bucket}`).toContain(bucket);
    }
  });

  it('records whether the username had to be typed from memory', () => {
    // The likeliest place to lose someone is asking them to recall their handle
    // on a different service, so the funnel has to be able to test that.
    expect(SRC).toContain('username_prefilled');
  });
});
