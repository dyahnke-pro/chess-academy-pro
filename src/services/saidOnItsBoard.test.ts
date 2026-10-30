import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { deriveNextPlanFacts } from './nextPlans';
import { planStepLine } from './planStep';
import { moveJob, MINE } from './bookMoveWhy';

// A LINE IS TRUE ON THE BOARD IT IS SAID ON (Review prod audit 2026-10-30, on
// Carlsen–Grischuk, Norway 2015 — board accuracy failed on two lines that
// described a board one move old).
const game = (() => {
  const c = new Chess();
  c.loadPgn(readFileSync('src/services/__fixtures__/jMVMo1Ua.pgn', 'utf8'));
  return c.history();
})();
const fenAt = (plies: number): string => {
  const c = new Chess();
  for (const san of game.slice(0, plies)) c.move(san);
  return c.fen();
};

describe('the plan step credited after their reply holds on the board after it', () => {
  it('32.Qc3 is no step against the c5 pawn once 32…c4 has moved it', () => {
    expect(game[62]).toBe('Qc3');
    expect(game[63]).toBe('c4');
    const before = fenAt(62);
    const plan = deriveNextPlanFacts(before, 'w', { namesStudentMoves: true }).find((p) => p.kind === 'weak-pawn' && p.squares[0] === 'c5');
    expect(plan).toBeDefined();
    // Said right after Qc3, it is a step; said after …c4, the pawn is gone.
    expect(planStepLine(plan!, before, 'Qc3', 'w', 'you', fenAt(63))?.text).toMatch(/one more piece on their weak pawn on c5/);
    expect(planStepLine(plan!, before, 'Qc3', 'w', 'you', fenAt(64))).toBeNull();
  });
});

describe('a move that steps away from a threatened push names no square it left', () => {
  it("37.Qe4 stops …e4, which would have hit the queen — not \"your queen on f3\"", () => {
    expect(game[72]).toBe('Qe4');
    const job = moveJob(fenAt(72), 'Qe4', 'w', MINE);
    expect(job?.clause).toBe('it stops their pawn coming to e4, which would have hit your queen');
    expect(job?.squares).not.toContain('f3');
  });
});
