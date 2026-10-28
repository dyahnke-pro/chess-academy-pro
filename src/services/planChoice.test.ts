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
    const plans = deriveNextPlanFacts(KING_F8_W, 'w', { namesStudentMoves: true });
    expect(plans[0].kind).toBe('king-attack');
    expect(whyThisPlan(plans)).toMatch(/^their king on f8 is still in the centre, and a king you can reach is the biggest target on the board — so it comes before /);
  });
  it('an isolated pawn: the why names the pawn and what guarding it costs them', () => {
    const plans = deriveNextPlanFacts(ISO, 'w', { namesStudentMoves: true });
    const weak = plans.find((p) => p.kind === 'weak-pawn');
    expect(weak?.squares[0]).toBe('d5');
    expect(whyThisPlan([weak!])).toBe('no pawn of theirs can protect their pawn on d5, so every piece that guards it is a piece doing nothing else');
  });
});

describe('the method — three questions, answered on the board', () => {
  it('names their weakness, and asks before it answers', () => {
    const read = methodRead(ISO, 'w');
    expect(read?.weakness?.phrase).toBe('their isolated pawn on d5');
    expect(methodLine(read!, ISO)).toMatch(/^How do you find a plan\? .*‖.? Checks, captures, threats: [^.]*\. Their weakness: their isolated pawn on d5\./);
  });
});

describe('the concrete how', () => {
  it('counts the weak pawn: how often you hit it against its guards', () => {
    const weak = deriveNextPlanFacts(ISO, 'w', { namesStudentMoves: true }).find((p) => p.kind === 'weak-pawn');
    expect(weak?.text).toMatch(/Count it: you (don't hit it yet|hit it \w+) and they guard it \w+/);
  });
});

describe('credit: the student\'s move as a step of the plan', () => {
  it('the knight planted in front of the weak pawn is credited', () => {
    const weak = deriveNextPlanFacts(ISO, 'w', { namesStudentMoves: true }).find((p) => p.kind === 'weak-pawn')!;
    expect(planStepLine(weak, ISO, 'Nd4', 'w', 'you')?.text).toBe('Your knight to d4 was a step of the plan: it sits in front of their weak pawn on d5, so the pawn can never advance.');
  });
  it('a piece that adds nothing against the pawn is not credited (the queen already hit d5)', () => {
    const weak = deriveNextPlanFacts(ISO, 'w', { namesStudentMoves: true }).find((p) => p.kind === 'weak-pawn')!;
    const c = new Chess(ISO);
    // Qb3 adds the queen against d5 from a square nothing of theirs can take.
    expect(c.moves()).toContain('Qb3');
    expect(planStepLine(weak, ISO, 'Qb3', 'w', 'you')).toBeNull();
  });
  it('a move that does nothing for the plan is not credited', () => {
    const weak = deriveNextPlanFacts(ISO, 'w', { namesStudentMoves: true }).find((p) => p.kind === 'weak-pawn')!;
    expect(planStepLine(weak, ISO, 'h3', 'w', 'you')).toBeNull();
  });
});

describe('a step that drops the piece is never credited', () => {
  it('Bc4 hits d5, but the d5 pawn takes it', () => {
    const weak = deriveNextPlanFacts(ISO, 'w', { namesStudentMoves: true }).find((p) => p.kind === 'weak-pawn')!;
    expect(planStepLine(weak, ISO, 'Bc4', 'w', 'you')).toBeNull();
  });
});

// David 2026-10-15: "That doesn't line up lol. Should be improve the rook by
// placing it on open file, plant the knight on the weak square and break open
// with the pawn." The three answers ARE the plan, in that order.
describe('the method\'s answers make the plan', () => {
  const FEN = 'r3nrk1/pp1p1ppp/8/4P3/8/3B1N2/PP3PPP/R4RK1 b - - 0 15';
  it('rook to the open file, knight to the hole, then the break — and why that order', async () => {
    const { newPlanThread, planThreadTurn } = await import('./planThread');
    const line = planThreadTurn(newPlanThread(), { ply: 30, fenBefore: FEN, fenAfter: FEN, student: 'b', holdPlayable: false })[0]?.text ?? '';
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
    const line = planThreadTurn(newPlanThread(), { ply: 59, fenBefore: passer, fenAfter: passer, student: 'w', holdPlayable: false })[0]?.text ?? '';
    expect(line).toMatch(/passed pawn/);
    expect(line).not.toMatch(/How do you find a plan/);
  });
});

// David 2026-10-15: "Arrows trace its route?" — every step of the plan's
// routes is an arrow, each a legal move on its OWN board (the piece walked).
describe('the plan traces its routes', () => {
  const FEN = 'r3nrk1/pp1p1ppp/8/4P3/8/3B1N2/PP3PPP/R4RK1 b - - 0 15';
  it('rook to the file, the knight hop by hop, the break pushes', async () => {
    const { newPlanThread, planThreadTurn } = await import('./planThread');
    const { Chess } = await import('chess.js');
    const l = planThreadTurn(newPlanThread(), { ply: 30, fenBefore: FEN, fenAfter: FEN, student: 'b', holdPlayable: false })[0];
    expect(l?.arrows?.map((a) => a.from + a.to)).toEqual(['a8c8', 'e8c7', 'c7e6', 'e6d4', 'd7d6', 'f7f6']);
    for (const a of l?.arrows ?? []) {
      const parts = a.fen.split(' '); parts[1] = 'b';
      expect(new Chess(parts.join(' ')).move({ from: a.from, to: a.to }), `${a.from}${a.to}`).toBeTruthy();
    }
  });
});

// David 2026-10-15: "Plans should also come from CCT" — the forcing scan is
// step zero: what it finds is the plan's first step.
describe('checks, captures, threats come first', () => {
  it('a free piece of theirs is the first step of the plan', async () => {
    const { methodRead, methodPlan } = await import('./planChoice');
    // Their knight on d4 is attacked by your rook on d8 and guarded by nothing.
    const fen = '3rnrk1/pp3ppp/8/4P3/3N4/8/PP3PPP/R4RK1 b - - 0 15';
    const r = methodRead(fen, 'b');
    expect(r?.cct?.answer).toMatch(/their knight on d4 is free to take/);
    expect(methodPlan(r!)?.steps[0]).toMatch(/^take their knight on d4 first/);
  });
  it('a quiet board says the scan found nothing — and never claims checks it did not look for', async () => {
    const { methodRead, methodLine } = await import('./planChoice');
    const r = methodRead('r3nrk1/pp1p1ppp/8/4P3/8/3B1N2/PP3PPP/R4RK1 b - - 0 15', 'b')!;
    expect(methodLine(r, 'r3nrk1/pp1p1ppp/8/4P3/8/3B1N2/PP3PPP/R4RK1 b - - 0 15')).toMatch(/Checks, captures, threats: nothing of yours can be taken, and nothing of theirs is free\./);
  });
});

describe('a why question is never asked twice in a game', () => {
  it('the second plan beating the same alternative says "Why it matters:"', async () => {
    const { newPlanThread, planThreadTurn } = await import('./planThread');
    const t = newPlanThread();
    t.methodSaid = true;
    t.whyAsked.add('seizing the open c-file');
    const fen = '6k1/1P3ppp/8/8/8/8/5PPP/2r3K1 w - - 0 30';
    const line = planThreadTurn(t, { ply: 59, fenBefore: fen, fenAfter: fen, student: 'w', holdPlayable: false })[0]?.text ?? '';
    expect(line).not.toMatch(/Why this one and not seizing the open c-file\?/);
  });
});

describe('Learn holds a plan step the student could play right now (David 2026-10-18)', () => {
  // David's Learn game after …Nbd7: the method said "Your pawn break: the push
  // to d5" and drew d4-d5 before he moved.
  const FEN = 'r2qkb1r/pp1n1ppp/2p2n2/4p3/3PP3/2P2B2/P1P2PPP/R1BQ1RK1 w kq - 2 10';
  it('held: the break is "ready now", never d5, with no arrow and no mark', async () => {
    const { methodRead, methodLine, methodPlan, methodSquares } = await import('./planChoice');
    const r = methodRead(FEN, 'w', true);
    expect(r?.breakHeld).toBe(true);
    const line = methodLine(r!, FEN);
    expect(line).toMatch(/ready to push right now/);
    expect(line).not.toMatch(/d5/);
    const mp = methodPlan(r!, FEN);
    expect(mp?.text).not.toMatch(/d5/);
    expect(mp?.arrows.some((a) => a.to === 'd5')).toBe(false);
    expect(methodSquares(r!)).not.toContain('d5');
  });
  it('NEGATIVE CONTROL: Review names it (the game is over)', async () => {
    const { methodRead, methodLine } = await import('./planChoice');
    expect(methodLine(methodRead(FEN, 'w', false)!, FEN)).toMatch(/the push to d5/);
  });
});

describe('a passer is named by its file (David replay 2026-10-19, move 49)', () => {
  it('stays true after the pawn walks', async () => {
    const { planWorth } = await import('./planChoice');
    const w = planWorth({ kind: 'passer', squares: ['d6'] } as unknown as Parameters<typeof planWorth>[0]);
    expect(w).toMatch(/your d-pawn/);
    expect(w).not.toMatch(/d6/);
  });
});
