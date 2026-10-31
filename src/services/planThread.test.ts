// The student's structural plan across a game — the one thread Learn and Review
// both keep (David 2026-10-07: "Learn needs to state the structural plans!!").
import { describe, it, expect } from 'vitest';
import { withoutTags } from '../utils/thinkPause';
import { Chess } from 'chess.js';
import { deriveNextPlanFacts } from './nextPlans';
import { planThreadTurn, PLAN_THREAD_HOLD_PLIES, adoptPlanTrial, structurePlanEvent } from './planThread';
// The plan thread's values are the game's story's (WO-STORY-MATRIX-01 P1-8b).
import { emptyPlanThread, copyPlanThread } from './gameStory';

const CENTRE_KING = 'r3k2r/ppp2ppp/2n2n2/8/8/2N2N2/PPPQ1PPP/R3K2R b KQkq - 0 12';
/** The same board with Black's king already walked to f8 — no castling left. */
const KING_F8 = 'r4k1r/ppp2ppp/2n2n2/8/8/2N2N2/PPPQ1PPP/R3K2R b KQ - 0 12';
const OPEN_C = 'r5k1/pp3ppp/8/3p4/8/8/PP3PPP/3R2K1 b - - 0 25';
const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const asWhite = (fen: string): string => fen.replace(' b ', ' w ');

describe('planThread — stated once, stopped with its proof', () => {
  it('states the board\'s plan, then says HOW their move stopped it, then the new plan', () => {
    const t = emptyPlanThread();
    const first = planThreadTurn(t, { ply: 22, fenBefore: KING_F8, fenAfter: asWhite(KING_F8), student: 'w', holdPlayable: false });
    // The first plan of a game is FOUND out loud: the three questions, a
    // pause, the answers, the plan, and why it beats the next plan.
    const line = first.map((l) => l.text)[0];
    expect(withoutTags(line)).toMatch(/^How do you find a plan\? .* ‖ Checks, captures, threats: [^.]*\. Their weakness: their king, still on f8\./);
    // THE ANSWERS ARE THE PLAN (David 2026-10-15: "That doesn't line up"):
    // the worst piece's step, then the weakness's — never an unrelated pick.
    expect(line).toMatch(/Your worst piece: your rook on a1, with no open file yet\./);
    expect(line).toMatch(/So the plan: put a rook on the open e-file; attack their king on f8 before it gets out\. Why that target\? With the centre opening, it can be attacked before it reaches safety\.$/);
    const second = planThreadTurn(t, { ply: 24, fenBefore: KING_F8, fenAfter: after(KING_F8, 'Kg8'), student: 'w', holdPlayable: false });
    expect(second[0].text).toBe('Their king stepped to g8, out of the open centre — the attack on it is off. That plan is off.');
    if (second[1]) expect(second[1].text).toMatch(/^The new plan is to /);
  });

  it('the second stop in a row is said like a coach', () => {
    const t = emptyPlanThread();
    t.stoppedInRow = 1;
    t.stated = { fact: deriveNextPlanFacts(asWhite(OPEN_C), 'w', { namesStudentMoves: true }).find((p) => p.kind === 'open-file')!, ply: 40 };
    const lines = planThreadTurn(t, { ply: 42, fenBefore: OPEN_C, fenAfter: after(OPEN_C, 'Rc8'), student: 'w', holdPlayable: false });
    expect(lines[0].text).toContain("They put their rook on the c-file first — it's contested now.");
    expect(lines[0].text).toContain("That's two of your plans they've shut down in a row — good defending.");
  });

  it('a plan that stands is not said again; a quiet move proves nothing', () => {
    const t = emptyPlanThread();
    planThreadTurn(t, { ply: 22, fenBefore: CENTRE_KING, fenAfter: asWhite(CENTRE_KING), student: 'w', holdPlayable: false });
    expect(planThreadTurn(t, { ply: 24, fenBefore: CENTRE_KING, fenAfter: after(CENTRE_KING, 'a6'), student: 'w', holdPlayable: false })).toEqual([]);
  });
});

describe('a plan teaches its how-to once a game (Learn audit 2026-10-15)', () => {
  it('restated after a break, the plan names its goal without the how', async () => {
    const { planThreadTurn } = await import('./planThread');
    const t = emptyPlanThread();
    const fen = asWhite(KING_F8);
    // The first statement is the method's own plan; the how waits for the
    // plan's own statement, said once.
    const first = planThreadTurn(t, { ply: 20, fenBefore: fen, fenAfter: fen, student: 'w', holdPlayable: false });
    expect(first[0]?.text).toMatch(/So the plan:/);
    t.stated = null;
    const second = planThreadTurn(t, { ply: 40, fenBefore: fen, fenAfter: fen, student: 'w', holdPlayable: false });
    expect(second[0]?.text).toMatch(/Here's how:/);
    t.stated = null;
    const again = planThreadTurn(t, { ply: 60, fenBefore: fen, fenAfter: fen, student: 'w', holdPlayable: false });
    expect(again[0]?.text).toBeTruthy();
    expect(again[0]?.text).not.toMatch(/Here's how:/);
  });
});

describe('one plan, one announcement — the thread and the arc share the plan goal (Learn audit 2026-10-15)', () => {
  it('the thread\'s key for a plan equals the arc\'s id for the same goal', async () => {
    const { planAimKey } = await import('./nextPlans');
    const { aimsOf } = await import('./planArc');
    expect(planAimKey('passer', 'a7')).toBe('plan-aim:passer:a');
    expect(planAimKey('open-file', 'd1')).toBe('plan-aim:file:d');
    expect(planAimKey('outpost', 'd5')).toBe('plan-aim:outpost:d5');
    expect(planAimKey('king-attack', null)).toBe('plan-aim:king-attack');
    const ids = aimsOf({ nearEnemyKing: 0, kingAttackSquares: [], shieldStripped: 0, outposts: ['d5'], opening: ['d'], passedPawns: ['a7'] } as never, 'student').map((a) => `plan-aim:${a.id}`);
    expect(ids).toEqual(expect.arrayContaining(['plan-aim:passer:a', 'plan-aim:file:d', 'plan-aim:outpost:d5']));
  });
});

// Review tape 2026-10-15 (the Alapin, Black): a stated plan held through a
// running passed pawn, while a plan of the SAME rank never replaced it.
describe('a stronger plan replaces the one that stands; an equal or weaker one never does', () => {
  const SANS = 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 Nc6 Nc3 Nb6 Nf3 d6 exd6 Qxd6 Be2 Bg4 Nb5 Qd7 Bf4 Nd5 Ne5 Bxe2 Qxe2 Nxf4 Nxd7 Nxe2 Nc7+ Kxd7 Nxa8 Nexd4 Rd1 e5 a3 Bc5 b4 Nxb4 axb4 Bxb4+ Kf1 Rxa8 Rb1 a5 h4 Rc8'.split(' ');
  it('the passed pawn is stated once it runs', () => {
    const c = new Chess(); const t = emptyPlanThread();
    const said: Array<{ ply: number; text: string }> = [];
    SANS.forEach((san, i) => {
      const before = c.fen(); c.move(san);
      if (i % 2 === 0) for (const l of planThreadTurn(t, { ply: i + 1, fenBefore: before, fenAfter: c.fen(), student: 'b', holdPlayable: false })) said.push({ ply: i + 1, text: l.text });
    });
    expect(said.some((x) => /passed pawn/.test(x.text))).toBe(true);
    for (let i = 1; i < said.length; i++) expect(said[i].ply - said[i - 1].ply).toBeGreaterThanOrEqual(PLAN_THREAD_HOLD_PLIES);
  });
});

describe('a plan HELD by the door is offered again — the thread adopts only what was said (A-plan P3)', () => {
  it('the method-bearing first plan, held on a threat turn, comes back on the next turn', () => {
    const t = emptyPlanThread();
    const trial = copyPlanThread(t);
    const first = planThreadTurn(trial, { ply: 22, fenBefore: KING_F8, fenAfter: asWhite(KING_F8), student: 'w', holdPlayable: false });
    expect(first[0].text).toMatch(/^How do you find a plan\?/);
    // The door held it: nothing of it spoke.
    expect(adoptPlanTrial(t, trial, first.map((l) => l.claim), [])).toBe(false);
    expect(t.methodSaid).toBe(false);
    expect(t.stated).toBeNull();
    // Next turn it is offered again, method and all — and this time it speaks.
    const trial2 = copyPlanThread(t);
    const again = planThreadTurn(trial2, { ply: 24, fenBefore: KING_F8, fenAfter: asWhite(KING_F8), student: 'w', holdPlayable: false });
    expect(again[0].text).toMatch(/^How do you find a plan\?/);
    expect(adoptPlanTrial(t, trial2, again.map((l) => l.claim), [again[0].claim])).toBe(true);
    expect(t.methodSaid).toBe(true);
  });
});

describe('the opening has no structural plan (David 2026-10-19: "the plan in the opening is to develop and castle")', () => {
  it('move 4 of the Smith-Morra: no "worst piece is your rook on a1"', async () => {
    const { Chess } = await import('chess.js');
    const { planThreadTurn } = await import('./planThread');
    const c = new Chess();
    for (const m of ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3']) c.move(m);
    const fenBefore = c.fen();
    c.move('d6');
    const lines = planThreadTurn(emptyPlanThread(), { ply: 8, fenBefore, fenAfter: c.fen(), student: 'w', holdPlayable: true });
    expect(lines.map((l) => l.text).join(' ')).not.toMatch(/plan|worst piece/i);
  });
});

describe('their move as a step of THEIR plan (WO-DECIDER-02: one reader, both seats)', () => {
  // White to move with Black's isolated pawn on d5: White's plan is that pawn.
  // The STUDENT is Black, so White's Nd4 is their step — said from your seat.
  const ISO = 'r2q1rk1/pp2bppp/2n2n2/3p4/8/2N2N2/PP2BPPP/R2Q1RK1 w - - 0 12';
  it('their knight planted in front of your weak pawn is named as their plan at work', () => {
    const t = emptyPlanThread();
    const lines = planThreadTurn(t, { ply: 23, fenBefore: ISO, fenAfter: after(ISO, 'Nd4'), student: 'b', holdPlayable: false });
    expect(lines.map((l) => l.text)).toContain('Their knight to d4 was a step of their plan: it sits in front of your weak pawn on d5, so the pawn can never advance.');
  });
  it('a move that is no step of their plan says nothing of it', () => {
    const t = emptyPlanThread();
    const lines = planThreadTurn(t, { ply: 23, fenBefore: ISO, fenAfter: after(ISO, 'h3'), student: 'b', holdPlayable: false });
    expect(lines.some((l) => /their plan/.test(l.text))).toBe(false);
  });
});

// v5 re-run (2026-10-29, chesscom-143368469378, the student Black): their
// h-pawn walked h4 → h5 and the coach said "Their pawn moved from h4 to h5,
// so it is no longer the weak pawn you were besieging. That plan is off. The
// new plan is to win their weak pawn on h5" — and again for c4 → c5 → c6 → c7.
describe('the same pawn is the same plan', () => {
  const BEFORE = '8/5k2/8/8/2P3RP/1P3K2/r7/8 w - - 0 49';
  const AFTER = '8/5k2/8/7P/2P3R1/1P3K2/r7/8 b - - 0 49';
  it('a weak pawn that steps forward and is still weak keeps the plan — no stop, no "new plan"', () => {
    const t = emptyPlanThread();
    const fact = deriveNextPlanFacts(BEFORE.replace(' w ', ' b '), 'b', { namesStudentMoves: true }).find((p) => p.kind === 'weak-pawn' && p.squares[0] === 'h4');
    expect(fact).toBeTruthy();
    t.stated = { fact: fact!, ply: 90 };
    const lines = planThreadTurn(t, { ply: 97, fenBefore: BEFORE, fenAfter: AFTER, student: 'b', holdPlayable: false });
    expect(lines.map((l) => l.text).join(' ')).not.toMatch(/no longer the weak pawn|That plan is off|The new plan|The plan changes/);
    expect(t.stated?.fact.squares[0]).toBe('h5');
  });
});

// v5 re-run (2026-10-29, chesscom-147974419492 ply 27, the student Black):
// their Nxd6+ checked the king and the coach answered "How do you find a
// plan? First the forcing scan…". A student in check has one move to find.
describe('no plan is stated to a student in check', () => {
  const BEFORE = '1nb1k2r/5ppp/2Pp4/rN1Qp1q1/p3P3/6P1/PPP2P1P/R3K1NR w KQk - 1 14';
  const AFTER = '1nb1k2r/5ppp/2PN4/r2Qp1q1/p3P3/6P1/PPP2P1P/R3K1NR b KQk - 0 14';
  it('their check: nothing about a plan', () => {
    const lines = planThreadTurn(emptyPlanThread(), { ply: 27, fenBefore: BEFORE, fenAfter: AFTER, student: 'b', holdPlayable: false });
    expect(lines.map((l) => l.text).join(' ')).not.toMatch(/plan/i);
  });
  it('NEGATIVE CONTROL: the same thread states a plan on a quiet board', () => {
    const t = emptyPlanThread();
    const first = planThreadTurn(t, { ply: 22, fenBefore: KING_F8, fenAfter: asWhite(KING_F8), student: 'w', holdPlayable: false });
    expect(first.map((l) => l.text).join(' ')).toMatch(/plan/i);
  });
});

// THE STRUCTURE'S PLAN, ONE AT A TIME (folded in from planMemory, WO-STORY-
// MATRIX-01 P1-8b): announced once, carried while it stands, said as a change
// when a different one replaces it. Its memory is the story's structure thread.
describe('structurePlanEvent — a plan is announced once and carried until the structure changes', () => {
  const PASSER = { id: 'passer-mine', text: 'push the passed pawn' };
  const IQP = { id: 'iqp-theirs', text: 'blockade the isolated pawn' };

  it('announces the first plan, carries the same plan, marks a different one as changed', () => {
    expect(structurePlanEvent(null, PASSER)).toBe('announce');
    expect(structurePlanEvent('passer-mine', PASSER)).toBe('carry');
    expect(structurePlanEvent('passer-mine', IQP)).toBe('changed');
  });

  it('IDENTITY, NOT PROSE — advancing the pawn you were told to advance is not a new plan', () => {
    // The regression this replaced: the rendered sentence was compared, so
    // "your passed pawn on b5" → "on b6" read as the coach changing its mind.
    expect(structurePlanEvent('passer-mine', { id: 'passer-mine', text: 'your passed pawn on b6 is the trump' })).toBe('carry');
  });

  it('a race whose WINNER FLIPS really is a new plan', () => {
    expect(structurePlanEvent('passer-race:you', { id: 'passer-race:them', text: 'they get there first' })).toBe('changed');
  });

  it('a board with no plan says nothing', () => {
    expect(structurePlanEvent('iqp-mine', null)).toBe('none');
  });
});
