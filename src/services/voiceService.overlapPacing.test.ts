// A dropped-for-overlap line must still COST ITS READING TIME.
//
// Auto-advance is voice-promise gated (the locked strict-narration contract).
// The no-overlap gate rightly refuses to stack a second voice — but it used to
// resolve the dropped line's promise INSTANTLY, which handed a walkthrough beat
// a zero-length clock: the chain advanced early and the next beat's cleanup
// `stop()` cut the still-playing sentence mid-word. David 2026-08-05:
// "sentences getting cut off by other sentences" — with the
// `voiceService.speakInternal.noOverlap` audit entries as the fingerprint.
//
// The contract pinned here: while something is playing, a second speak
// resolves on reading pace (the same `simulateSpeechDuration` the audit mute
// uses), never instantly. Dedup keeps its instant resolve — a duplicate within
// the tight window is the same caller double-firing, not a beat pacing
// anything.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('no-overlap drop keeps reading pace', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a speak dropped for overlap resolves on a text-proportional delay, not instantly', async () => {
    const { voiceService } = await import('./voiceService');
    const svc = voiceService as unknown as { playing: boolean };
    svc.playing = true; // something is on the air

    let resolved = false;
    // 30 words ≈ 12s at the 150wpm simulate pace.
    const line = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    const p = voiceService.speakForced(line).then(() => { resolved = true; });

    // Instant resolve is the bug — after a tick it must still be pending.
    await vi.advanceTimersByTimeAsync(50);
    expect(resolved, 'dropped line resolved instantly — the walkthrough clock is gone').toBe(false);

    // …and it does resolve once the reading time has passed.
    await vi.advanceTimersByTimeAsync(15_000);
    await p;
    expect(resolved).toBe(true);
  });

  it('the source stays honest in code: noOverlap and throttle await the simulated duration', async () => {
    // Belt-and-suspenders shape check so a refactor can't quietly restore the
    // bare `return` — the exact regression this file exists to prevent.
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/services/voiceService.ts', 'utf8');
    const noOverlap = src.slice(src.indexOf("source: 'voiceService.speakInternal.noOverlap'"), src.indexOf("source: 'voiceService.speakInternal.throttle'"));
    expect(noOverlap).toContain('await this.simulateSpeechDuration(text)');
    const throttle = src.slice(src.indexOf("source: 'voiceService.speakInternal.throttle'"));
    expect(throttle.slice(0, 1200)).toContain('await this.simulateSpeechDuration(text)');
  });
});
