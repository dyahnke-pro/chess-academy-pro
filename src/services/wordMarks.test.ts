import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { marksOfWords } from './wordMarks';

const after = (...sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('the marks a line\'s words call for', () => {
  it('lights every square it names — no cap (the lesson path lit four at most)', () => {
    const fen = after('e4', 'e5', 'Nf3', 'Nc6');
    const text = 'The knight eyes d4 and e5, and later f5, g5, h4 and b5 are its squares too.';
    expect(new Set(marksOfWords(text, fen, 'white').highlights)).toEqual(new Set(['d4', 'e5', 'f5', 'g5', 'h4', 'b5']));
  });
  it('arrows every move it names, on the board shown', () => {
    const fen = after('e4', 'e5', 'Nf3', 'Nc6');
    const m = marksOfWords('Bb5 pins nothing yet, but it puts the question to the knight.', fen, 'white');
    expect(m.arrows.map((a) => `${a.startSquare}${a.endSquare}`)).toEqual(['f1b5']);
    expect(m.highlights).toEqual([]);
  });
  it('nothing said, nothing marked', () => {
    expect(marksOfWords('  ', after('e4'), 'black')).toEqual({ highlights: [], arrows: [] });
  });
});
