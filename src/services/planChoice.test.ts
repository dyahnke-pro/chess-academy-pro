// planChoice + planStep (David 2026-10-15): the plan is FOUND out loud — the
// three questions, why this plan beats the next one — and a move that carries
// it out is credited. Board positions, real computers.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deriveNextPlanFacts } from './nextPlans';
import { methodRead, whyThisPlan, methodLine } from './planChoice';
import { planStepLine } from './planStep';

const KING_F8_W = 'r4k1r/ppp2ppp/2n2n2/8/8/2N2N2/PPPQ1PPP/R3K2R w KQ - 0 12';
// White to move; Black's d5 pawn is isolated, White's knight can reach d4.
const ISO = 'r2q1rk1/pp2bppp/2n2n2/3p4/8/2N2N2/PP2BPPP/R2Q1RK1 w - - 0 12';

describe('why this plan', () => {
  it('says what makes the chosen target worth more than the next plan', () => {
    const plans = deriveNextPlanFacts(KING_F8_W, 'w');
    expect(plans[0].kind).toBe('king-attack');
    expect(whyThisPlan(plans)).toMatch(/^their king on f8 is still in the centre, and a king you can reach is the biggest target on the board — so it comes before /);
  });
  it('an isolated pawn: the why names the pawn and what guarding it costs them', () => {
    const plans = deriveNextPlanFacts(ISO, 'w');
    const weak = plans.find((p) => p.kind === 'weak-pawn');
    expect(weak?.squares[0]).toBe('d5');
    expect(whyThisPlan([weak!])).toBe('no pawn of theirs can protect their pawn on d5, so every piece that guards it is a piece doing nothing else');
  });
});

describe('the method — three questions, answered on the board', () => {
  it('names their weakness, and asks before it answers', () => {
    const read = methodRead(ISO, 'w');
    expect(read?.weakness?.phrase).toBe('their isolated pawn on d5');
    expect(methodLine(read!)).toMatch(/^How do you find a plan\? .*‖ Their weakness: their isolated pawn on d5\./);
  });
});

describe('the concrete how', () => {
  it('counts the weak pawn: how often you hit it against its guards', () => {
    const weak = deriveNextPlanFacts(ISO, 'w').find((p) => p.kind === 'weak-pawn');
    expect(weak?.text).toMatch(/Count it: you (don't hit it yet|hit it \w+) and they guard it \w+/);
  });
});

describe('credit: the student\'s move as a step of the plan', () => {
  it('the knight planted in front of the weak pawn is credited', () => {
    const weak = deriveNextPlanFacts(ISO, 'w').find((p) => p.kind === 'weak-pawn')!;
    expect(planStepLine(weak, ISO, 'Nd4', 'w')?.text).toBe('Your knight to d4 was a step of the plan: it sits in front of their weak pawn on d5, so the pawn can never advance.');
  });
  it('a piece that adds nothing against the pawn is not credited (the queen already hit d5)', () => {
    const weak = deriveNextPlanFacts(ISO, 'w').find((p) => p.kind === 'weak-pawn')!;
    const c = new Chess(ISO);
    // Qb3 adds the queen against d5 from a square nothing of theirs can take.
    expect(c.moves()).toContain('Qb3');
    expect(planStepLine(weak, ISO, 'Qb3', 'w')).toBeNull();
  });
  it('a move that does nothing for the plan is not credited', () => {
    const weak = deriveNextPlanFacts(ISO, 'w').find((p) => p.kind === 'weak-pawn')!;
    expect(planStepLine(weak, ISO, 'h3', 'w')).toBeNull();
  });
});

describe('a step that drops the piece is never credited', () => {
  it('Bc4 hits d5, but the d5 pawn takes it', () => {
    const weak = deriveNextPlanFacts(ISO, 'w').find((p) => p.kind === 'weak-pawn')!;
    expect(planStepLine(weak, ISO, 'Bc4', 'w')).toBeNull();
  });
});

// David 2026-10-15: "That doesn't line up lol. Should be improve the rook by
// placing it on open file, plant the knight on the weak square and break open
// with the pawn." The three answers ARE the plan, in that order.
describe('the method\'s answers make the plan', () => {
  const FEN = 'r3nrk1/pp1p1ppp/8/4P3/8/3B1N2/PP3PPP/R4RK1 b - - 0 15';
  it('rook to the open file, knight to the hole, then the break — and why that order', async () => {
    const { newPlanThread, planThreadTurn } = await import('./planThread');
    const line = planThreadTurn(newPlanThread(), { ply: 30, fenBefore: FEN, fenAfter: FEN, student: 'b' })[0]?.text ?? '';
    expect(line).toMatch(/Your worst piece: your rook on a8, with no open file yet\./);
    expect(line).toMatch(/So the plan: put a rook on the open c-file; bring your knight on e8 to d4, by way of c7 and e6 — no pawn of theirs can attack it there; then break open with the push to d6 or f6\./);
    expect(line).toMatch(/Why in that order\? A break opens the position/);
  });
  it('chat answers "how do I find a plan" with the same plan', async () => {
    const { assemblePlanMethodAnswer } = await import('./groundedAnswer');
    const a = assemblePlanMethodAnswer(FEN, 'black').facts;
    expect(a).toMatch(/So the plan: put a rook on the open c-file; bring your knight on e8 to d4/);
    expect(a).not.toMatch(/Beyond that: plant a knight/);
  }, 60000);
  it('a passed pawn outranks the three questions: no method before an unrelated plan', async () => {
    const { newPlanThread, planThreadTurn } = await import('./planThread');
    const passer = '6k1/5ppp/8/P7/8/8/5PPP/6K1 w - - 0 30';
    const line = planThreadTurn(newPlanThread(), { ply: 59, fenBefore: passer, fenAfter: passer, student: 'w' })[0]?.text ?? '';
    expect(line).toMatch(/passed pawn/);
    expect(line).not.toMatch(/How do you find a plan/);
  });
});
