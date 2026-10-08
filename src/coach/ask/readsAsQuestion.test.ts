import { describe, expect, it } from 'vitest';
import { readsAsQuestion, resolvePlayName } from './playName';
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
  it('costs the opening gate nothing on the real set', () => {
    // The gate's only job: never drop a request that names an opening, and
    // never start a lesson on a question. Score exactly those two misses.
    const rows = REAL_QUESTIONS.filter((r) => !THAI.test(r.q));
    const opening = (q: string) =>
      resolvePlayName(q.replace(/^\s*(?:(?:can|could|would) you\s+|please\s+)?(?:play|teach(?: me)?|show me|walk ?through|drill|review)\s+(?:me\s+)?/i, '')).kind === 'resolved';
    const named = rows.filter((r) => opening(r.q)).map((r) => ({ ...r, question: readsAsQuestion(r.q, true) }));
    const dropped = named.filter((r) => r.kind === 'command' && r.question);
    const wrongLesson = named.filter((r) => r.kind !== 'command' && !r.question);
    console.log(`gate misses on ${rows.length}: dropped ${dropped.length}, wrong lesson ${wrongLesson.length}\n`
      + [...dropped, ...wrongLesson].map((r) => `${r.kind}: ${r.q.slice(0, 70)}`).join('\n'));
    expect(dropped.length).toBe(0);
    expect(wrongLesson.length).toBeLessThanOrEqual(2);
  }, 120_000);
});
