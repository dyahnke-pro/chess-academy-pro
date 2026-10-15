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
