import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REVIEW_ASKS_QUESTIONS } from './CoachGameReview';

// REVIEW ASKS NO QUESTIONS (David 2026-10-10: "Remove the question from review
// for now. I don't like that one."). Every stop that opens a question in the
// walk must sit behind the one switch, and the switch is off.
const src = readFileSync(resolve(__dirname, 'CoachGameReview.tsx'), 'utf8');

describe('review asks no questions', () => {
  it('the switch is off', () => {
    expect(REVIEW_ASKS_QUESTIONS).toBe(false);
  });
  it('every question card opens only behind the switch', () => {
    // The openers of the two walk questions. The rewind offer and the
    // principle quiz open only after one of these (or the why-picker, stripped
    // 2026-08-28) resolves, so gating these gates every question.
    const openers = ['setTurningActive(planned)', 'setCriticalCard(criticalMoment)'];
    for (const o of openers) {
      const at = src.indexOf(o);
      expect(at, `${o} not found — re-check this gate`).toBeGreaterThan(0);
      expect(src.indexOf(o, at + 1), `${o} opens from a second place`).toBe(-1);
      const before = src.slice(Math.max(0, at - 3000), at);
      const lastIf = before.lastIndexOf('if (REVIEW_ASKS_QUESTIONS');
      expect(lastIf, `${o} opens without the switch`).toBeGreaterThan(-1);
    }
    expect(src, 'the why-picker came back').not.toMatch(/reviewFaucet\.raiseSlipPrompt|raiseSlipPrompt\(/);
  });
});
