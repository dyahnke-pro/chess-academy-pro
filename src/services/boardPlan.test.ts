import { describe, it, expect } from 'vitest';
import { structurePlan } from './boardPlan';

describe('structurePlan — structure→plan (conservative, board-true)', () => {
  it('names the push plan for the student’s own passed pawn', () => {
    // White pawn on e6, no black pawns on d/e/f ahead of it → passed.
    const fen = '4k3/8/4P3/8/8/8/8/4K3 w - - 0 1';
    const plan = structurePlan(fen, 'w');
    expect(plan).toMatch(/passed pawn on e6/i);
    expect(plan).toMatch(/push it/i);
  });

  it('names the blockade plan for the opponent’s passed pawn', () => {
    // Black pawn on e3 passed; student is White → blockade.
    const fen = '4k3/8/8/8/8/4p3/8/4K3 w - - 0 1';
    const plan = structurePlan(fen, 'w');
    expect(plan).toMatch(/passed pawn on e3/i);
    expect(plan).toMatch(/blockade|in front of it/i);
  });

  it('names the IQP plan when the student has an isolated central pawn', () => {
    // White d4 pawn, no white c/e pawns → isolated queen's pawn.
    const fen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PP3PPP/RNBQKBNR w KQkq - 0 1';
    const plan = structurePlan(fen, 'w');
    expect(plan).toMatch(/isolated pawn on d4/i);
    expect(plan).toMatch(/keep pieces on|activity/i);
  });

  it('returns null when there is no canonical single plan', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(structurePlan(fen, 'w')).toBeNull();
  });
});
