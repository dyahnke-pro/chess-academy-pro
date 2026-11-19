// THE ONE PLAN OF THE BOARD on Danya's own boards (have-check 2026-11-19):
// the plan he says, read off the engine's best line, and silence where the
// board's point is a tactic or the game is decided.
import { describe, it, expect } from 'vitest';
import { planOfTheBoard, breakPlanText, type PlanLineIn } from './planOfTheBoard';
import { planSteps } from './planSteps';
import { Chess } from 'chess.js';
import { decideRead, readContextOf, type ReadFact } from './readDecider';

const line = (moves: string[], evaluation: number, mate: number | null = null): PlanLineIn[] => [{ moves, evaluation, mate }];
const plan = (fen: string, moves: string[], cp: number, mate: number | null = null) =>
  planOfTheBoard({ fen, lines: line(moves, cp, mate), student: fen.split(' ')[1] as 'w' | 'b', namesMoves: true });

// the positional rook lift #0 — "The rook lift Re1-e3-b3 swings the rook across the third rank to the queenside"
const ROOK_LIFT = '1r2kb1r/5ppp/pqbppn2/8/2P1P3/6P1/1P1N1PBP/R1BQR1K1 w k - 0 15';
const ROOK_LIFT_LINE = ['e1e3', 'f6d7', 'e3b3', 'b6a7', 'b3b8', 'd7b8', 'b2b4', 'a7d7', 'b4b5', 'a6b5'];
// the knockout blow #2 — "The quiet pawn advance b4 (then b5) to dislodge the c6 knight is the knockout"
const KNOCKOUT = '3rr3/pp1k2pp/2n1p3/3p1q2/8/1P3NP1/1PP1QPP1/3RR1K1 w - - 0 19';
const KNOCKOUT_LINE = ['b3b4', 'a7a6', 'b4b5', 'a6b5', 'e2b5', 'd7c7', 'f3d4', 'c6d4', 'd1d4', 'f5c2'];
// Alekhine's gun 2 #0 — "Build Alekhine's gun: queen behind doubled rooks on the c-file" (pressure on the pinned c6 knight)
const GUN = 'r4rk1/p3nqp1/Ppn1p2p/1B1pPp2/1P1P1P2/5N2/3Q2PP/R4RK1 w - - 0 20';
const GUN_LINE = ['a1c1', 'f8c8', 'c1c2', 'g8h7', 'f1c1', 'f7e8', 'c2c3', 'c8c7', 'c1c2', 'a8d8'];

describe('planOfTheBoard — the plan Danya says', () => {
  it('the rook lift: a road whose first step is the best move itself', () => {
    const p = plan(ROOK_LIFT, ROOK_LIFT_LINE, 147);
    expect(p?.kind).toBe('road');
    expect(p?.text).toBe('Your rook on e1 has a better road: e3 and then b3.');
    expect(p?.starts).toBe(0);
  });
  it('planSteps reads a one-step road after the best move (the old minimum of two steps after it lost the rook lift)', () => {
    const c = new Chess(ROOK_LIFT); c.move('Re3');
    const p = planSteps(c.fen(), ['f6d7', 'e3b3', 'b6a7'], 'e1e3', 3, true, true);
    expect(p?.maneuver?.route).toEqual(['e3', 'b3']);
  });
  it('the knockout: the pawn that kicks the c6 knight', () => {
    const p = plan(KNOCKOUT, KNOCKOUT_LINE, 214);
    expect(p?.kind).toBe('kick');
    expect(p?.text).toBe('The plan: b4 and then b5, to kick their knight off c6.');
  });
  it("Alekhine's gun: the rooks stacked on the c-file at the knight on c6", () => {
    const p = plan(GUN, GUN_LINE, 266);
    expect(p?.text).toMatch(/Rc2, Rfc1 and then Rc3/);
    expect(p?.target).toBe('c6');
  });
  it('silent when the best line is a tactic: a check first', () => {
    // The same board, the line opened by a check instead.
    expect(plan('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 30', ['d1d8'], 0)).toBeNull();
  });
  it('silent when the game is decided: three pawns, or a mate', () => {
    expect(plan(ROOK_LIFT, ROOK_LIFT_LINE, 350)).toBeNull();
    expect(plan(ROOK_LIFT, ROOK_LIFT_LINE, 100000, 4)).toBeNull();
  });
  it('silent when the line only shuffles: kings walking are no plan (negative control)', () => {
    expect(plan('8/8/4k3/8/8/4K3/4P3/8 w - - 0 50', ['e3d4', 'e6d6', 'd4e4', 'd6e6'], 40)).toBeNull();
  });
  it('a break is said as where the plan goes, one idea a sentence', () => {
    expect(breakPlanText('h4 is a pawn break: it attacks their pawn on g5. If they take, it opens the g-file for your rooks.', 'your'))
      .toBe('Your plan builds to h4: it attacks their pawn on g5. If they take, it opens the g-file for your rooks.');
    expect(breakPlanText('hxg6 is a pawn break, and it half-opens the h-file for your rook.', 'your'))
      .toBe('Your plan builds to hxg6, which half-opens the h-file for your rook.');
  });
});

describe('the read decider says the board\'s plan before a description', () => {
  it('the board\'s one plan is the plan step\'s say, before any weight (a later list of steps weighs more)', () => {
    const facts: ReadFact[] = [
      { from: 'bestMove', kind: 'plan-steps', computer: 'planSteps', text: 'Your plan from here: Nf1, Ne3 and then Nd5.', squares: ['f1', 'd5'] },
      { from: 'position', kind: 'structure-plan', computer: 'readPosition', text: 'Your rook on a1 is your best-placed piece — it has the half-open a-file.', squares: ['a1'] },
      { from: 'bestMove', kind: 'plan-steps', computer: 'planOfTheBoard', text: 'Your rook on e1 has a better road: e3 and then b3.', squares: ['e1', 'e3', 'b3'] },
    ];
    const ctx = readContextOf({ fen: ROOK_LIFT, top: { evaluation: 147, mate: null }, bestUci: 'e1e3', withheld: null, studentShot: false });
    const said = decideRead(facts, ctx).facts.map((f) => f.computer);
    expect(said).toContain('planOfTheBoard');
    expect(said).not.toContain('readPosition');
    expect(said).not.toContain('planSteps');
  });
});
