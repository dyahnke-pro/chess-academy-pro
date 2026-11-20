// THE ONE PLAN OF THE BOARD on Danya's own boards (have-check 2026-11-19):
// the plan he says, read off the engine's best line, and silence where the
// board's point is a tactic or the game is decided.
import { describe, it, expect } from 'vitest';
import { planOfTheBoard, breakPlanText, type PlanLineIn } from './planOfTheBoard';
import { planSteps } from './planSteps';
import { Chess } from 'chess.js';
import { decideRead, readContextOf, type ReadFact } from './readDecider';
import { linesOf } from '../test/replayGame';

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
    expect(p?.text).toBe('Next, the rook goes on to b3. There it hits their rook on b8.');
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
    expect(p?.text).toBe('Your plan is to kick their knight off c6. The b-pawn does it: b4, then b5.');
  });
  it("Alekhine's gun: the rooks stacked on the c-file at the knight on c6", () => {
    const p = plan(GUN, GUN_LINE, 266);
    expect(p?.text).toBe('Your pieces line up on their knight on c6. It starts with Rc2.');
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
      { from: 'bestMove', kind: 'plan-steps', computer: 'planOfTheBoard', text: 'Next, the rook goes on to b3.', squares: ['e1', 'e3', 'b3'] },
    ];
    const ctx = readContextOf({ fen: ROOK_LIFT, top: { evaluation: 147, mate: null }, bestUci: 'e1e3', withheld: null, studentShot: false, said: null });
    const said = decideRead(facts, ctx).facts.map((f) => f.computer);
    expect(said).toContain('planOfTheBoard');
    expect(said).not.toContain('readPosition');
    expect(said).not.toContain('planSteps');
  });
});

// HIS FLOW (scratchpad planflow/flow.md): what the board turns on, then the
// plan — each step proven by its computer, real Danya boards.
describe('planOfTheBoard — the step that led to the plan, in his order', () => {
  it('the worst piece leads its road: the rook off the open b-file goes b8, then b2 (Danya speedrun C2un…#74)', () => {
    const fen = '3r2k1/p3rp2/6p1/3pb1P1/4p1q1/2P1PnN1/P3QBR1/2R2K2 b - - 11 37';
    const p = planOfTheBoard({ fen, lines: linesOf([{ uci: 'g4h3', cp: -14, mate: null, pv: ['g4h3', 'g3h1', 'g8g7', 'e2a6', 'd8b8', 'f2g3', 'e5g3', 'h1g3', 'b8b2', 'a6f6', 'g7g8', 'g3e2'] }]), student: 'b', namesMoves: true });
    expect(p?.why?.step).toBe('worst-piece');
    // The piece named once in full, then "it" (the human-voice rule 3).
    expect(p?.text).toBe('Your rook on d8 is still off the open b-file. It has a better road, by way of b8. It ends on b2. There it hits e2, next to their king.');
  });
  it('the structure sends the play to a wing: a locked centre and a queenside break (mysterious GM moves #4)', () => {
    const fen = '5rk1/pp1q1rpp/4b3/3pPp1Q/P1pP3P/2P3P1/1P3RB1/5RK1 w - - 0 26';
    const p = plan(fen, ['a4a5', 'd7d8', 'a5a6', 'b7a6', 'h5g5', 'd8g5', 'h4g5', 'f8b8', 'f1a1', 'b8b6'], 44);
    expect(p?.why?.step).toBe('structure');
    expect(p?.text.startsWith('The centre is locked, so the play goes to the queenside.')).toBe(true);
    expect(p?.planText).toContain('Your plan builds to a6');
  });
  it('what they want: their break the best move takes away comes first (the double bishop sacrifice #3)', () => {
    const fen = '3r1rk1/bpq2ppp/p1b1p3/2P5/1P2B3/P4Q2/1B3PPP/2R2RK1 w - - 0 18';
    const p = plan(fen, ['f3c3', 'f7f6', 'c3h3', 'f6f5', 'e4c6', 'c7c6', 'h3g3', 'f8f7', 'b2e5', 'd8d5'], 164);
    expect(p?.why?.step).toBe('their-idea');
    expect(p?.text).toMatch(/^(They want the …a5 break, so take it away first\.|Their idea is the …a5 break\. Take it away first\.) /);
    // One claim with the stopped break's own computer.
    expect(p?.why?.claims).toContain('stops-break:…a5');
  });
  it('a road made of two pieces is no road: the a6 knight taken on c5 does not go on to e6 (speedrun 9JUl…#28)', () => {
    const fen = '2r2k2/pp3pbp/n1pr1np1/4p1B1/2P1P3/2N2P2/PP2B1PP/R3K2R b KQ - 1 14';
    const p = planOfTheBoard({ fen, lines: linesOf([{ uci: 'f6d7', cp: -2, mate: null, pv: ['f6d7', 'c3a4', 'b7b6', 'e1f2', 'a6c5', 'a4c5', 'd7c5', 'g5e3', 'c5e6', 'a1d1', 'e6d4', 'g2g3'] }]), student: 'b', namesMoves: true });
    expect(p?.text ?? '').not.toMatch(/knight on a6 .*e6/);
  });
  it('a rook off its open file leads only a road onto that file: "off the open e-file" is never said before a road to d5 (speedrun _zT8…#55)', () => {
    const fen = '4r3/1p3pk1/p2prnp1/P1q1n2p/R7/2N4P/1PPQ1PP1/3R1B1K w - - 2 28';
    const p = planOfTheBoard({ fen, lines: linesOf([{ uci: 'c3e4', cp: 57, mate: null, pv: ['c3e4', 'c5c6', 'e4f6', 'e6f6', 'a4d4', 'c6c7', 'd4d5', 'e5c6', 'b2b4', 'e8e5', 'c2c4', 'e5d5'] }]), student: 'b', namesMoves: true });
    expect(p?.text ?? '').not.toContain('off the open e-file');
  });
  it('no reason is said when none is proven: the plan alone (the knockout blow #2)', () => {
    const p = plan(KNOCKOUT, KNOCKOUT_LINE, 214);
    expect(p?.why).toBeNull();
    expect(p?.text).toBe(p?.planText);
  });
  it('negative controls: a tactic first or a decided game — no plan, so no reason', () => {
    expect(plan('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 30', ['d1d8'], 0)).toBeNull();
    expect(plan('5rk1/pp1q1rpp/4b3/3pPp1Q/P1pP3P/2P3P1/1P3RB1/5RK1 w - - 0 26', ['a4a5', 'd7d8', 'a5a6', 'b7a6'], 420)).toBeNull();
  });
});

// A ROAD JUDGED BY WHAT IT HITS AT ITS END, its steps spread through the line.
describe('planOfTheBoard — a road judged by its end, steps spread through the line', () => {
  it('the bishop via f7 to g6 joins the rooks on the seventh (rooks on the seventh revisited #2)', () => {
    const fen = '5r1k/R2R2p1/7p/p4prP/2B5/5K2/8/8 w - - 0 36';
    const p = plan(fen, ['c4f7', 'f5f4', 'f7g6', 'g5g3', 'f3f2', 'f8g8', 'a7a5', 'g3c3', 'a5a2', 'c3c8'], 279);
    expect(p?.kind).toBe('road');
    expect(p?.planText).toBe('Your bishop on c4 has a better road, by way of f7. On g6 it joins your rooks on the seventh rank. It hits h7, next to their king.');
  });
  it('the rook d7 then f7, king moves between its steps, aims down the f-file at f2 (the positional rook lift #2)', () => {
    const fen = '2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25';
    const p = plan(fen, ['c8b8', 'e1e2', 'd8d7', 'd1a1', 'b8c8', 'e2e1', 'c8c7', 'e1f1', 'd7f7', 'f3d2'], -126);
    expect(p?.text).toBe('Your rook on d8 has a better road, by way of d7. On f7 it aims down the f-file at f2, next to their king.');
    expect(p?.starts).toBe(1);
  });
  it('negative control: a capture before the last step ends the road', () => {
    const fen = '2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25';
    const p = plan(fen, ['c8b8', 'e1e2', 'd8d7', 'h6g5', 'b8c8', 'e2e1', 'd7f7'], -126);
    expect(p?.text ?? '').not.toContain('rook on d8 has a better road');
  });
  it('negative control: a stop that already has the job makes it no road (the rook on b4 already hits c4 before a4, the tactical detector #3)', () => {
    const fen = '6k1/p1r2pp1/b3pn2/2p1N2p/2P5/5BPP/Pr2PP2/R3K2R b KQ - 0 24';
    const p = plan(fen, ['b2b4', 'a2a3', 'b4a4', 'a1c1', 'a4a3', 'e1g1', 'f6d7', 'e5d7', 'c7d7', 'f3h5'], -54);
    expect(p?.kind).not.toBe('road');
  });
});
