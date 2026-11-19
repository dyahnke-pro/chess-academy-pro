import { describe, expect, it } from 'vitest';
import { forcingBestDecides } from './positionFacts';

// A SLOW PLAN IS NOT SAID WHILE A TACTIC DECIDES (Danya narration test
// 2026-11-19). Real boards, their saved lines (White's view).
const L = (cp: number, u: string): { evaluation: number; mate: null; moves: string[] } => ({ evaluation: cp, mate: null, moves: [u] });
describe('forcingBestDecides', () => {
  it('the chess investigator #1: Nf6+ at +4.03 over f4 +2.75 decides', () => {
    expect(forcingBestDecides('r5k1/p2p2pp/b7/1ppNrp2/3pP3/PB1P4/1PPb1PPP/R4RK1 w - - 0 18', [L(403, 'd5f6'), L(275, 'f2f4')])).toBe(true);
  });
  it('the Greek gift lives on #0: Bxh7+ at +4.14 decides', () => {
    expect(forcingBestDecides('r1bq1rk1/pp1n1ppp/2n1p3/3pP3/3P4/P1PB1N2/5PPP/R1BQ1RK1 w - - 0 1', [L(414, 'd3h7'), L(319, 'f3g5')])).toBe(true);
  });
  it('negative control: a quiet best move never decides, nor a capture level with the rest', () => {
    expect(forcingBestDecides('r1bq1rk1/pp1n1ppp/2n1p3/3pP3/3P4/P1PB1N2/5PPP/R1BQ1RK1 w - - 0 1', [L(414, 'f1e1'), L(100, 'f3g5')])).toBe(false);
    expect(forcingBestDecides('r1bq1rk1/pp1n1ppp/2n1p3/3pP3/3P4/P1PB1N2/5PPP/R1BQ1RK1 w - - 0 1', [L(40, 'd3h7'), L(30, 'f3g5')])).toBe(false);
    // An only move that holds the balance: Rxe5 saves the queen at +0.55,
    // everything else is -2.00 — a sharp gap, but nothing decided.
    expect(forcingBestDecides('r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p2Q1/2PB4/PP3PPP/R1B1R1K1 w - - 0 16', [L(55, 'e1e5'), L(-200, 'g4g3')])).toBe(false);
  });
});
