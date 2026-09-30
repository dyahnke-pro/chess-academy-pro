import { describe, expect, it } from 'vitest';
import { lineWins, mateLine } from './lineCalc';

describe('mateLine — the mate played out, and the quiet move before it', () => {
  // Black king h8 boxed by its own h-pawn; Re8+ fails to …Kg7 until the bishop covers g7.
  const fen = '7k/p6p/8/8/8/8/8/2B1R1K1 w - - 0 1';
  it('names the escape square the quiet move takes', () => {
    const m = mateLine(fen, ['c1h6', 'a7a6', 'e1e8'], 'w', 'Bh6');
    expect(m?.quiet).toBe(true);
    expect(m?.taken).toEqual(['g7']);
    expect(m?.text).toBe('No check yet — the quiet Bh6 comes first: it takes g7 from their king, and Re8 is mate. Bh6 …a6 Re8#.');
  });
  it('a line that does not mate says nothing', () => {
    expect(mateLine(fen, ['c1h6', 'a7a6', 'e1e7'], 'w')).toBeNull();
  });
  it('a checking line is a forced mate, not a quiet one', () => {
    const f = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
    expect(mateLine(f, ['a1a8'], 'w')).toBeNull(); // too short to be a line
    const m = mateLine('6k1/5pp1/7p/8/8/8/5PPP/RR4K1 w - - 0 1', ['a1a8', 'g8h7', 'b1b8', 'g7g6', 'b8h8'], 'w');
    expect(m).toBeNull(); // …g6 opens g7 — not mate
  });
  it('lineWins is unchanged by the mate reader', () => {
    expect(lineWins(fen, ['c1h6', 'a7a6'], 'w')).toBeNull();
  });
});
