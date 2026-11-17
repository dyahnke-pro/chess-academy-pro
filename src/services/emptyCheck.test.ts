import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { emptyCheckAt, emptyCheckLine } from './emptyCheck';

const at = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const FEN = at(['f3', 'e5', 'e4']);

describe('a check that goes nowhere (Danya Ytkf3: "…Qh4+ is simply blocked by g3")', () => {
  it('says the block and that the queen has to move again', () => {
    const e = emptyCheckAt(FEN, 'Qh4+', 90, 'g2g3');
    expect(e?.kind).toBe('block');
    const l = emptyCheckLine(e!, 'your', FEN);
    expect(l).toMatch(/block it with g3/);
    expect(l).toMatch(/queen/);
    // Learn never names the move just played: the piece leads, not "Qh4+".
    expect(l).not.toMatch(/Qh4/);
    expect(l).not.toMatch(/ — /);
  });
  it('silent when the check cost nothing, or the answer takes the checker', () => {
    expect(emptyCheckAt(FEN, 'Qh4+', 20, 'g2g3')).toBeNull();
    expect(emptyCheckAt(at(['e4', 'f5', 'Qh5+', 'g6']), 'Qxg6+', 300, 'h7g6')).toBeNull();
  });
});
