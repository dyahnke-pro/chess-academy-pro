// The "Review Voice Narration" toggle must actually gate the review's voice.
//
// 🔒 IT SHIPPED AS A LIE. The toggle was written to preferences, mapped
// through useSettings, defaulted to true — and not one of CoachGameReview's
// 33 speak sites ever read it. A paying user who turned review voice OFF
// kept hearing the coach. Found by the dead-settings sweep (every preference
// key the Settings UI writes, cross-checked against readers), which is the
// scan this gate now encodes for this one control.
//
// The wire is a single guard (`reviewSay`) all speak sites route through.
// This gate holds the shape of that wire: if a future edit adds a bare
// `voiceService.speakForced` call to the review, the count moves and this
// fails with the line number in hand.
//
// 🔒 THE FILE BOUNDARY WAS THE SECOND LIE (2026-08-13 live drive). The gate
// above went green while the walk kept talking with the toggle off — because
// the per-ply walk speech lives in useReviewPlayback.ts, outside the scanned
// file. A gate scoped to one file proves that file, nothing more. The hook is
// now scanned too, and its speak site must sit behind its own coachReviewVoice
// read.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8');
const HOOK = readFileSync('src/hooks/useReviewPlayback.ts', 'utf8');

describe('the Review Voice Narration toggle is wired', () => {
  it('every spoken line routes through the reviewSay guard', () => {
    // Exactly ONE direct call — the guard's own body. Anything more is a
    // speak site that dodged the toggle.
    const direct = SRC.match(/voiceService\.speakForced\(/g) ?? [];
    expect(direct.length, 'a speak site bypasses the Review Voice toggle').toBe(1);
    // And the guard is actually used, not decorative.
    const routed = SRC.match(/\breviewSay\(/g) ?? [];
    expect(routed.length).toBeGreaterThan(20);
  });

  it('the guard consults the toggle, not a constant', () => {
    expect(SRC).toMatch(/reviewVoiceRef\.current\s*\?\s*voiceService\.speakForced/);
    expect(SRC).toMatch(/reviewVoiceRef\.current\s*=\s*settings\.coachReviewVoice/);
  });

  it('the walk playback hook gates its per-ply speech on the toggle', () => {
    // One speak site in the hook, and the coachReviewVoice read must come
    // BEFORE it in the same function — an early return with voice off.
    const speaks = HOOK.match(/voiceService\.speakForced\(/g) ?? [];
    expect(speaks.length, 'useReviewPlayback grew an extra speak site').toBe(1);
    const readAt = HOOK.indexOf('preferences.coachReviewVoice');
    const speakAt = HOOK.indexOf('voiceService.speakForced(');
    expect(readAt, 'the hook never reads coachReviewVoice').toBeGreaterThan(-1);
    expect(readAt, 'the toggle read must precede the speak call').toBeLessThan(speakAt);
  });
});
