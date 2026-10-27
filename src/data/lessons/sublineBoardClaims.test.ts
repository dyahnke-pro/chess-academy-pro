// Gate: subline narration is held to the board-claim checker like every other
// Openings-tab narration (WO-COURSE-01 E). The Openings-tab gate
// (`narrationBoardClaims.test.ts`) never read sublines, so 888 of 18,679
// subline narration units failed the board check unseen (the Ruy Berlin's "pin
// on c6" with d7 between knight and king). Each unit is checked on the boards
// of the moves it narrates. The violations found when the gate landed
// (2026-10-27) are a SHRINK-ONLY baseline: the narration rewrite clears them;
// a new false claim fails here, and a fixed one must leave the baseline.
import { describe, it, expect } from 'vitest';
import { boardsFor, checkBoardClaims } from '../narrationBoardClaims';
import { _SUBLINE_NARRATION } from './sublineNarration';
import sublinesData from '../course-sublines.json';
import type { CourseSubline } from '../../services/openingCourse';
import baseline from './sublineBoardClaims.baseline.json';

const SUBS = sublinesData as Record<string, Record<string, CourseSubline[] | undefined> | undefined>;

/** One row per false claim: `${key} ${unit}: "${claim}"`. */
function sublineBoardClaimViolations(): string[] {
  const out: string[] = [];
  for (const [key, n] of Object.entries(_SUBLINE_NARRATION)) {
    const m = /^(.+)::(-?\d+)::(.+)@(\d+)$/.exec(key);
    if (!m) continue;
    const sub = SUBS[m[1]]?.[m[2]]?.find((s) => s.triggerMove === m[3] && s.atPly === Number(m[4]));
    if (!sub) continue;
    const units: Array<[string, string | undefined, number]> = [
      ['intro', n.intro.say, sub.atPly + 1],
      ...(n.beats ?? []).map((b): [string, string | undefined, number] => [`beat@${b.atMove}`, b.say, b.atMove + 1]),
    ];
    for (const [unit, text, upto] of units) {
      if (!text) continue;
      const boards = boardsFor(sub.moves.slice(0, upto));
      if (!boards) continue;
      for (const v of checkBoardClaims(boards, text)) out.push(`${key} ${unit}: "${v.claim}"`);
    }
  }
  return out;
}

describe('subline narration board claims', () => {
  const now = sublineBoardClaimViolations();
  const base = new Set(baseline);

  it('no NEW false claim outside the baseline', { timeout: 300000 }, () => {
    expect(now.filter((v) => !base.has(v))).toEqual([]);
  });

  it('the baseline only shrinks — a fixed claim leaves it', () => {
    const live = new Set(now);
    expect([...base].filter((v) => !live.has(v))).toEqual([]);
  });
});
