// THE OUTPOST LEVER NAMES ONLY HOLES A PIECE CAN TAKE (G4.5, WO-ONE-COACH-01
// Build 4). It said "plant a knight on" the four most central holes — squares
// in your own half, squares no knight could reach — because the hole list was
// cut to four instead of read through a bar.
import { describe, it, expect } from 'vitest';
import { boardPlanFacts } from './boardPlanFacts';

const outpost = (fen: string): string | undefined =>
  boardPlanFacts(fen, 'white')?.levers.find((l) => l.kind === 'outpost')?.phrase;

describe('the outpost lever', () => {
  it('a knight: only the hole in their camp the knight gets to', () => {
    // c4, the only stop to e5, is hit by the c8 rook; d6 is reached via b5.
    expect(outpost('2r2rk1/pp4pp/8/8/8/N7/PP4PP/3RR1K1 w - - 0 20')).toBe('plant a knight on d6');
  });
  it('a bishop: the holes of its colour it reaches, said as a bishop', () => {
    expect(outpost('2r2rk1/pp4pp/8/8/8/1B6/PP4PP/3RR1K1 w - - 0 20')).toBe('post a bishop on d5 or e6');
  });
  it('no minor: no lever', () => {
    expect(outpost('2r2rk1/pp4pp/8/8/8/8/PP4PP/3RR1K1 w - - 0 20')).toBeUndefined();
  });
});
