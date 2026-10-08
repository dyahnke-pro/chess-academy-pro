import { describe, expect, it } from 'vitest';
import { readsAsQuestion } from './playName';
import { REAL_QUESTIONS } from './realQuestions.test.fixture';

const THAI = /[฀-๿]/;

describe('readsAsQuestion — the Learn page asks the shared reader first', () => {
  it('real requests to teach or play an opening are never taken as questions', () => {
    for (const q of ['Panov', 'Traxler counter gambit', 'Teach me the Scandi Panov', 'Play the Sicilian', 'Najdorff', 'Pirc defense', 'Walkthrough the alapin', "Bishop's Opening: Bishop's Opening: Bxh1 greed — Qxf7 is mate, Queen takes h8"]) {
      expect(readsAsQuestion(q, true), q).toBe(false);
    }
  });
  it('real questions are never taken as opening names', () => {
    for (const q of ['What is my best opening?', 'Which opening should I practice?', 'Did I have any good moves', 'What is my weakest', 'What should I play against the Caro?', 'Why is Nd7 best? Can’t I win the queen?']) {
      expect(readsAsQuestion(q, true), q).toBe(true);
    }
  });
  it('agrees with the hand labels on the real set', () => {
    const rows = REAL_QUESTIONS.filter((r) => !THAI.test(r.q));
    const wrong = rows.filter((r) => readsAsQuestion(r.q, true) === (r.kind === 'command'));
    console.log(`readsAsQuestion vs labels: ${rows.length - wrong.length}/${rows.length}\n` + wrong.map((r) => `${r.kind}: ${r.q.slice(0, 70)}`).join('\n'));
    // A command read as a question is the costly miss (the lesson never starts).
    expect(wrong.filter((r) => r.kind === 'command').length).toBeLessThanOrEqual(1);
  }, 60_000);
});
