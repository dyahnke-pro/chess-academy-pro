import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * THE BOARD BAR DECISIONS (David, 2026-11-24), wired on Learn and Play:
 *  - "Play line becomes Theory during the opening" — the bar's line slot takes
 *    the one theory view (`useTheoryView`), and Review's Theory button and the
 *    view perform through ONE runner (`performLecture`);
 *  - "Why? answers the last thing the coach said. After a hint it names the
 *    move with its reason, and that counts as shown." — Learn reads the one
 *    slot (`whyAnswer` over `lastSaid`), Play marks the board told and its
 *    graded record carries `prompted`.
 */
const code = (p: string): string => readFileSync(join(process.cwd(), p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LEARN = code('src/components/Coach/CoachTeachPage.tsx');
const PLAY = code('src/components/Coach/CoachGamePage.tsx');
const REVIEW = code('src/components/Coach/CoachGameReview.tsx');

describe('the board bar decisions are wired', () => {
  it('Learn and Play give the bar the theory view during the opening', () => {
    for (const page of [LEARN, PLAY]) {
      expect(page).toMatch(/useTheoryView\(\{/);
      expect(page).toMatch(/theory=\{[^}]*theoryView\.inOpening/);
    }
  });
  it('one theory runner: Review performs through performLecture, with no private copy', () => {
    expect(REVIEW).toMatch(/performLecture\(lectureSequence\(beats\)/);
    expect(REVIEW).not.toMatch(/speakPackage\(buildVoicePackage/);
  });
  it('Learn\'s Why answers the last thing said; a hint is what was said last', () => {
    expect(LEARN).toMatch(/whyAnswer\(learnMemRef\.current\.lastSaid, liveFenRef\.current\)/);
    expect(LEARN).toMatch(/learnMemRef\.current\.lastSaid = \{ kind: 'hint', fen, uci \}/);
    expect(LEARN).not.toMatch(/lastProof/);
  });
  it('Play: a hint or a Why makes the board told, and the graded record carries it', () => {
    expect(PLAY.match(/toldBoardsRef\.current\.add\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(PLAY).toMatch(/prompted: toldBoardsRef\.current\.has\(/);
  });
});
