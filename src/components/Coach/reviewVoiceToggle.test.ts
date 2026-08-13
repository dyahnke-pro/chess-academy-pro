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
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8');

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
});
