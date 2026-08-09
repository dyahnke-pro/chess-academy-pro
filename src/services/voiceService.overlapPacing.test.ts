// A line that has to wait its turn is SPOKEN, not thrown away.
//
// Two bugs, one after the other, and this file has now pinned both.
//
// The first: the no-overlap gate resolved a suppressed line's promise
// INSTANTLY. Auto-advance is voice-promise gated (the locked strict-narration
// contract), so that handed a walkthrough beat a zero-length clock — the chain
// advanced early and the next beat's cleanup `stop()` cut the still-playing
// sentence mid-word. David 2026-08-05: "sentences getting cut off by other
// sentences", with the `speakInternal.noOverlap` audit entries as the
// fingerprint. The fix made those drops resolve on reading pace.
//
// The second is that the fix was only a fix for PACING. The line was still
// discarded — `simulateSpeechDuration(text); return;` waits exactly as long as
// speaking would have taken and then says nothing, so the coach believes it
// spoke and the student hears silence. A real prod game (2026-08-09) lost three
// computed lines that way, two of them the most useful in the report: "you've
// got a skewer coming, 2 deep: Bb5, then Qd4" and "Play Na3, keeping the option
// of Qg4 later". David: "Why are we still rate limiting?? I told you to remove
// that!"
//
// The contract now: a line arriving while another is playing WAITS and then
// speaks. Pacing is preserved because waiting takes real time — the property
// the first fix was reaching for, without the silent discard. Dedup still
// drops, and should: a duplicate inside the tight window is the same caller
// double-firing, not a second thing to say.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('a line that waits its turn still gets spoken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for the air to clear instead of faking a read and giving up', async () => {
    const { voiceService } = await import('./voiceService');
    const svc = voiceService as unknown as { playing: boolean };
    svc.playing = true; // something is on the air, and stays there

    let resolved = false;
    // 30 words ≈ 12s at the simulate pace. Under the OLD code the line was
    // discarded and this promise resolved right about there. Under the new one
    // it is still waiting, because nothing has finished speaking.
    const line = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    void voiceService.speakForced(line).then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(50);
    expect(resolved, 'resolved instantly — the walkthrough clock is gone').toBe(false);

    await vi.advanceTimersByTimeAsync(14_000);
    expect(
      resolved,
      'resolved on reading pace while the air was still busy — that is the fake read, and the line was never spoken',
    ).toBe(false);
  });

  it('the source no longer discards an overlapping or throttled line', async () => {
    // A shape check, because the regression is invisible at runtime: a
    // discarded line and a spoken one look identical from the caller's side —
    // both resolve, on the same delay. Only the student can tell, and only by
    // noticing the silence.
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/services/voiceService.ts', 'utf8');
    const noOverlap = src.slice(
      src.indexOf("source: 'voiceService.speakInternal.noOverlap'"),
      src.indexOf("source: 'voiceService.speakInternal.throttle'"),
    );
    // It waits for the air to clear…
    expect(noOverlap).toContain('await this.whenNotSpeaking()');
    // …and the ONLY discard left in that branch is the bounded one, which is
    // audited. An unguarded `simulateSpeechDuration; return` is the bug.
    const discards = [...noOverlap.matchAll(/await this\.simulateSpeechDuration\(text\);\s*\n\s*return;/g)];
    expect(discards.length, 'more discards than the one bounded fallback').toBeLessThanOrEqual(1);
    if (discards.length === 1) {
      const before = noOverlap.slice(0, discards[0].index ?? 0);
      expect(before, 'the remaining discard is not the queue bound').toContain('MAX_SPEAK_WAITING');
    }

    const throttle = src.slice(src.indexOf("source: 'voiceService.speakInternal.throttle'")).slice(0, 1400);
    expect(throttle).toContain('THROTTLE_MS - (now - last.ts)');
    expect(
      /await this\.simulateSpeechDuration\(text\);\s*\n\s*return;/.test(throttle.slice(0, throttle.indexOf('lastAdmittedSpeak'))),
      'the throttle branch is discarding the line again',
    ).toBe(false);
  });

  it('still refuses an unbounded backlog, and says so out loud', async () => {
    // Waiting must not become a queue the student hears minutes late. The
    // bound drops — but audibly, in the audit, which is the whole difference
    // between this and the bug it replaces.
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/services/voiceService.ts', 'utf8');
    expect(src).toContain('MAX_SPEAK_WAITING');
    expect(src).toContain("source: 'voiceService.speakInternal.queueFull'");
  });
});
