// TWO PASSED-PAWN LINES FROM THE PROD FOCUS AUDIT (2026-11-09), each fixed at
// its producer:
//  - "The plan changes here — now it's to get your passed pawn on a6 promoting.
//    Here's how: it is 5 squares from queening." The distance sat INSIDE the
//    how; a second passer's repeated steps were dropped as already said, and
//    "Here's how:" was left on a bare distance. The distance is its own
//    sentence now, before the how.
//  - "e7 was their move — it would push the passed pawn on to e7." The push's
//    purpose named the square the move itself went to. It says the stake now:
//    how far from queening.
import { describe, it, expect } from 'vitest';
import { deriveNextPlanFacts } from './nextPlans';
import { describePlan, type SidePlan } from './lookaheadPlan';

describe('the passer plan: the distance is a fact, the how is the steps', () => {
  it('"It is two pushes from queening. Here\'s how: escort it…" — never "Here\'s how: it is"', () => {
    // White passed pawn on f6, no queens: the passer plan leads.
    const plan = deriveNextPlanFacts('6k1/8/5P2/8/8/8/8/6K1 w - - 0 1', 'w', { namesStudentMoves: true }).find((p) => p.kind === 'passer');
    expect(plan?.text).toContain('the plan from here is to get your passed pawn on f6 promoting. It is two pushes from queening. Here\'s how: escort it with your king and pieces.');
    expect(plan?.text).not.toMatch(/Here's how: it is/i);
  });
  it('a piece covering the next square is the first step of the how', () => {
    // A black rook on f8 covers f7.
    const plan = deriveNextPlanFacts('5rk1/8/5P2/8/8/8/8/6K1 w - - 0 1', 'w', { namesStudentMoves: true }).find((p) => p.kind === 'passer');
    expect(plan, 'the passer plan is on the board').toBeDefined();
    expect(plan?.text).toMatch(/It is two pushes from queening\. Here's how: their rook on f8 covers f7, so drive it off or cover f7 yourself first\. Escort it/);
  });
});

describe('a pushed passer\'s purpose says its stake, not its square', () => {
  it('"push the passed pawn within a square of queening", never "on to e7"', () => {
    const plan: SidePlan = {
      color: 'white', headingFor: ['e7'], opening: [], trading: [], outposts: [], materialSwing: 0,
      passedPawns: [], pushedPassers: ['e7'], shieldStripped: 0, tactic: null, tacticSquare: null,
      idlePieces: [], maneuver: null, checks: 0,
    } as unknown as SidePlan;
    const said = describePlan(plan, 'theirs');
    expect(said).toMatch(/within a square of queening/);
    expect(said).not.toMatch(/on to e7/);
  });
});
