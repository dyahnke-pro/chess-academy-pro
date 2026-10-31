// THE OPENING STORY'S WIRING ON THE LEARN PAGE (OS-3 review, 2026-10-20):
//   - the identity is said once a game, decided at the one read (not by two
//     say-once rules that disagreed);
//   - the break kept for the opening summary does not depend on the story
//     choosing to say it as an idea;
//   - opening analytics count what the voice carried, never what was offered.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');

describe('Learn: the opening story is wired once', () => {
  it('the identity is filtered once a game at the story read', () => {
    expect(src).toMatch(/readBoardAll\('openingStory'[^\n]*\)\n\s*\.filter\(\(r\) => r\.storyBeat !== 'identity' \|\| identityHeard\(learnMemRef\.current\.story\.current\(\)\) === null\)/);
  });
  it('the summary break is recorded from the masters plan, not from the key-break offer', () => {
    expect(src).not.toMatch(/storyReads\.some\(\(r\) => r\.storyBeat === 'key-break'\)/);
    expect(src).toMatch(/if \(!openingBreak\(story\.current\(\)\) && history\.length >= 6 && classifyPhase\(/);
  });
  it('opening analytics fire only from what was heard', () => {
    const helper = src.indexOf('const noteOpeningFactsHeard = ');
    expect(helper).toBeGreaterThan(-1);
    for (const ev of ['coach_opening_identity', 'coach_opening_plan_named']) {
      const all = [...src.matchAll(new RegExp(`captureEvent\\('${ev}'`, 'g'))].map((m) => m.index ?? -1);
      expect(all).toHaveLength(1);
      expect(all[0]).toBeGreaterThan(helper);
      expect(all[0] - helper).toBeLessThan(800);
    }
  });
});
