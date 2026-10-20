import { describe, it, expect } from 'vitest';
import { structurePlan } from './nextPlans';

describe('structurePlan — structure→plan (conservative, board-true)', () => {
  it('names the push plan for the student’s own passed pawn', () => {
    // White pawn on e6, no black pawns on d/e/f ahead of it → passed.
    const fen = '4k3/8/4P3/8/8/8/8/4K3 w - - 0 1';
    const plan = structurePlan(fen, 'w');
    expect(plan).toMatch(/passed pawn on e6/i);
    expect(plan).toMatch(/push it/i);
  });

  it('does NOT say "push it" when the passer is BLOCKADED (B#4)', () => {
    // White passed pawn e6, a black knight blockading on e7 → the push is stopped.
    const fen = '4k3/4n3/4P3/8/8/8/8/4K3 w - - 0 1';
    const plan = structurePlan(fen, 'w');
    expect(plan).toMatch(/passed pawn on e6/i);
    expect(plan).not.toMatch(/push it/i);
    expect(plan).toMatch(/blockade|dislodge|challenge/i);
  });

  it('does NOT say "push it" when the passer is SELF-BLOCKED (B#4)', () => {
    // White passed pawn e6 with White's own rook on e7 in its path.
    const fen = '4k3/4R3/4P3/8/8/8/8/4K3 w - - 0 1';
    const plan = structurePlan(fen, 'w');
    expect(plan).toMatch(/passed pawn on e6/i);
    expect(plan).not.toMatch(/push it/i);
    expect(plan).toMatch(/clear the way|path/i);
  });

  it('names the blockade plan for the opponent’s passed pawn', () => {
    // Black pawn on e3 passed; student is White → blockade.
    const fen = '4k3/8/8/8/8/4p3/8/4K3 w - - 0 1';
    const plan = structurePlan(fen, 'w');
    expect(plan).toMatch(/passed pawn on e3/i);
    expect(plan).toMatch(/blockade|in front of it/i);
  });

  it('names the IQP plan when the student has an isolated central pawn', () => {
    // A real isolani (no friendly c/e-pawn, no enemy d-pawn) — the one
    // definition the named structure uses too (census 9).
    const fen = 'r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 10';
    const plan = structurePlan(fen, 'w');
    expect(plan).toMatch(/isolated queen’s pawn/i);
    expect(plan).toMatch(/play actively while pieces are on/i);
    // A d-pawn still facing their d-pawn is not the named isolani, but it is
    // still an isolated central pawn with its own plan.
    const broad = structurePlan('rnbqkbnr/pppppppp/8/8/3P4/8/PP3PPP/RNBQKBNR w KQkq - 0 1', 'w');
    expect(broad).toMatch(/isolated pawn on d4/i);
    expect(broad).toMatch(/keep pieces on/i);
  });

  it('returns null when there is no canonical single plan', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(structurePlan(fen, 'w')).toBeNull();
  });
});

describe('the student\'s own isolated pawn is read before theirs (census 9 coverage measure)', () => {
  it('their named isolani does not speak over your isolated e-pawn', () => {
    // Black: isolated e-pawn on e5 (no d/f pawns). White: d4 with no c/e pawn and no Black d-pawn.
    const fen = '4k3/pp4pp/8/4p3/3P4/8/PP3PPP/4K3 b - - 0 1';
    expect(structurePlan(fen, 'b')).toMatch(/^You're playing with the isolated pawn on e5/);
  });
});
