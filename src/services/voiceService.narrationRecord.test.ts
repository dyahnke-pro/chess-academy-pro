// Every spoken OR suppressed line reaches the audit record with its FULL text.
//
// David 2026-08-06: "Can you pull the narrations from posthog instead of
// listener tool?" — yes, because `coach-narration-spoken` carries
// `narrationText` (the untruncated line) which the analytics bridge forwards
// to PostHog as `narration_text`. Two holes made that transcript lossy:
//   1. only the Polly and audit-mute tiers called `logNarrationSpoken` — a
//      device-TTS (Web Speech) line reached PostHog as a 40-char preview;
//   2. the drop events (brief-cap / dedup / no-overlap / throttle) carried
//      previews only, so what was SUPPRESSED could not be proven either.
// This pins both closed, at the source level — the wiring is inside deep
// speak paths whose runtime setup (audio elements, prefs, providers) a unit
// cannot honestly stand up, and a source pin catches the regression class
// that matters: someone deleting the call or the field.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/services/voiceService.ts', 'utf8');

describe('full narration text reaches the audit record', () => {
  it('logNarrationSpoken carries the untruncated line as narrationText', () => {
    const body = src.slice(src.indexOf('private async logNarrationSpoken'));
    expect(body.slice(0, 2000)).toContain('narrationText: text');
  });

  it('the Web Speech fallover tier records the full line too, not just Polly and mute', () => {
    // The fallover block: after describePollyFalloverReason, before
    // speakFallback — the call must sit on that path.
    const fallover = src.slice(
      src.indexOf('describePollyFalloverReason(this.lastSpeakDiagnostic)'),
      src.indexOf('await this.speakFallback(text);', src.indexOf('describePollyFalloverReason(this.lastSpeakDiagnostic)')),
    );
    expect(
      fallover.includes("logNarrationSpoken(text, 'web-speech'"),
      'a device-TTS line must be recorded with full text — it was the one tier that never was',
    ).toBe(true);
  });

  it('every suppression event carries the full suppressed text', () => {
    for (const gate of ['briefCap', 'dedup', 'noOverlap', 'throttle']) {
      const i = src.indexOf(`source: 'voiceService.speakInternal.${gate}'`);
      expect(i, `${gate} audit site missing`).toBeGreaterThan(-1);
      const block = src.slice(i, src.indexOf('});', i));
      expect(
        block.includes('narrationText: text'),
        `${gate} drop must record WHAT was suppressed, not just that something was`,
      ).toBe(true);
    }
  });
});
