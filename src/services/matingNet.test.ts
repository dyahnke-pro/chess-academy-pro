import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { matingNet } from './matingNet';

/** The board after a line from a FEN. */
function after(fen: string, sans: string[]): string {
  const c = new Chess(fen);
  for (const s of sans) c.move(s);
  return c.fen();
}

// a-guide-to-underpromotion#1: White's a8=N, and after …Qa7 g5 the black king
// on h7 is imprisoned — the queen holds g8, h8 and g6, the pawn on g5 holds h6,
// and g6 mates.
const START = '4Q3/Pq4pk/5p1p/5P1K/6PP/8/8/8 w - - 2 2';
const NET = after(START, ['a8=N', 'Qa7', 'g5']);
const NET2 = after(START, ['a8=N', 'Qa7', 'g5', 'hxg5', 'hxg5']);
const OUT = after(START, ['a8=N', 'Qa7', 'g5', 'hxg5', 'hxg5', 'fxg5']);

describe('matingNet', () => {
  it('reads the imprisoned king from the mating side, the mate held', () => {
    const n = matingNet(NET, 'w');
    expect(n).not.toBeNull();
    expect(n!.side).toBe('w');
    expect(n!.king).toBe('h7');
    expect(n!.mate).toBe('g6#');
    // h6 holds its own pawn: not a flight square.
    expect([...n!.flights].sort()).toEqual(['g6', 'g8', 'h8']);
    // Every flight square named once.
    expect(n!.cover.flatMap((p) => p.covers).sort()).toEqual(['g6', 'g8', 'h8']);
    expect(n!.cover[0]).toMatchObject({ square: 'e8', type: 'q' });
    expect(n!.text).toMatch(/^Their king on h7 (has no square to go to|is imprisoned)\./);
    expect(n!.text).toContain('Your queen on e8 covers g6, g8 and h8.');
    // The student's own mate is theirs to find: never named.
    expect(n!.text.replace('covers g6, g8 and h8', '')).not.toMatch(/g6/);
  });

  it('names their mate to the student whose king is netted', () => {
    const n = matingNet(NET, 'b');
    expect(n).not.toBeNull();
    expect(n!.text).toMatch(/^Your king on h7/);
    expect(n!.text).toContain('Their queen on e8 covers g6, g8 and h8.');
    expect(n!.text).toMatch(/g6/);
    expect(n!.text).toMatch(/checkmate/);
  });

  it('fires again on the second net of the line, the pawn holding h6', () => {
    const n = matingNet(NET2, 'w');
    expect(n?.king).toBe('h7');
    expect(n!.text).toContain('Your queen on e8 covers g6, g8 and h8. Your pawn on g5 covers h6.');
  });

  it('negative controls: the net broken, and the start position', () => {
    expect(matingNet(OUT, 'w')).toBeNull();
    expect(matingNet(START, 'w')).toBeNull();
    expect(matingNet(new Chess().fen(), 'w')).toBeNull();
  });

  it('is rotated, never rolled: the same board says the same words', () => {
    expect(matingNet(NET, 'w')!.text).toBe(matingNet(NET, 'w')!.text);
  });
});
