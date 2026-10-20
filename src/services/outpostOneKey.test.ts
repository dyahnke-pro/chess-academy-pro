// ONE OUTPOST, ONE KEY (dup map #4, David's Smith-Morra): 29.Nf6 "lands on the
// f6 outpost" (the rule), then 31.g5 "g5 makes f6 an outpost for the knight"
// (the board teacher) — the same f6, said twice. Both now carry `outpost:f6`,
// and a claim already said is dropped by the voice package.
import { describe, it, expect } from 'vitest';
import { boardTeacherPoint } from './learnBoardTeaching';
import { buildVoicePackage, spokenSentenceKeys } from './voicePackage';

const BEFORE_G5 = 'r7/pp3k2/3p1N2/8/3nP1P1/1P6/6K1/5R2 w - - 1 31';
const AFTER_G5 = 'r7/pp3k2/3p1N2/6P1/3nP3/1P6/6K1/5R2 b - - 0 31';

describe('the f6 outpost is one claim', () => {
  it('31.g5 — the board teacher’s outpost carries outpost:f6', () => {
    const h = boardTeacherPoint(BEFORE_G5, 'g5', AFTER_G5);
    expect(h?.text).toMatch(/f6 an outpost/);
    expect(h?.claims).toContain('outpost:f6');
  });
  it('once outpost:f6 was said, the second outpost sentence is dropped', () => {
    const first = { kind: 'computed' as const, text: 'Your knight to f6 lands on the f6 outpost, a square none of their pawns can attack.', fen: BEFORE_G5, claims: ['outpost:f6'] };
    const prior = new Set(spokenSentenceKeys({ kept: [first] }));
    const h = boardTeacherPoint(BEFORE_G5, 'g5', AFTER_G5)!;
    const pkg = buildVoicePackage([{ kind: 'computed', text: h.text, fen: AFTER_G5, claims: h.claims }], '', prior);
    expect(pkg.kept).toHaveLength(0);
    expect(pkg.dropped[0]?.reason).toBe('claim already said');
  });
});
