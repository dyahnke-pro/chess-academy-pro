import { describe, it, expect } from 'vitest';
import { fitReviewTurn, REVIEW_TURN_WORDS } from './coachFeatureService';

// The 2026-10-15 prod review ply (230 words): three fundamentals, each with its
// own how-to, ranked ahead of the verdict.
const P1 = "[principle] That was the same knight for the third time while 2 of your pieces still sit at home — every re-move hands the opponent a free turn. Here's how: Before you move a piece a second time, ask what it gains that a NEW piece would not.";
const P2 = '[principle] Tempo lost — after this they get d5 for free, hitting your knight on c6, and your next move is forced to react. The habit that fixes it: Count it out loud: does this move force them to answer, or do they get a free turn?';
const P3 = '[principle] Space handed over: stepping off d5 lets d5 claim it, and a pawn that far up cramps everything behind it. Next time: Before retreating, check whether you can hold the square by DEFENDING it instead.';
const VERDICT = '[verdict] Your knight to b6 was an inaccuracy, costing about half a point — the stronger move was e6 — it would guard your knight on d5.';
const KEY = '[point] Their d4 pawn is the key pawn: it guards e5, and if d4 drops, e5 goes with it.';
const words = (ps: string[]): number => ps.reduce((n, t) => n + t.replace(/^\[[a-z-]+\]\s*/, '').split(/\s+/).length, 0);

describe('review — one lead reason per ply (David 2026-10-14)', () => {
  it('the stacked fundamentals go first; the lead and the verdict always stay', () => {
    const out = fitReviewTurn([P1, P2, P3, VERDICT, KEY]);
    expect(out).toContain(P1);
    expect(out).toContain(VERDICT);
    expect(out).not.toContain(P3);
    expect(out).not.toContain(P2);
    expect(words(out)).toBeLessThanOrEqual(REVIEW_TURN_WORDS);
  });
  it('a ply that already fits is left whole', () => {
    expect(fitReviewTurn([VERDICT, KEY])).toEqual([VERDICT, KEY]);
  });
});

describe('one plan per review ply (review audit 2026-10-15: 139 words, two plans)', () => {
  it('the second plan may be evicted; the first stays', () => {
    const A = '[plan-now] The plan changes here — now it\'s to get your passed pawn on a7 promoting. Here\'s how: clear the square in front of it and push it one safe square at a time — every push brings it closer to a queen.';
    const B = '[plan-now] The plan from here is to make your knight on d4 the boss of the board. Here\'s how: keep a pawn guarding it and refuse trades that give it up — from there it presses on everything around it.';
    const LEAD = '[trade] A piece and three pawns for a rook — you are a pawn up overall, and the extra pawns are what wins it.';
    const out = fitReviewTurn([LEAD, A, B]);
    expect(out).toContain(A);
    expect(out).not.toContain(B);
  });
});
