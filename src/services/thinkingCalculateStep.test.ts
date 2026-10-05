import { describe, it, expect } from 'vitest';
import { calculateKey, calculateKit, calculatePrompt, withCalculableLine } from './thinkingCalculateStep';

// White: Rd1, Bc4; Black: Kg8, Qd7? Build a line that ends in a capture:
// 1.Rxd7 is immediate (1 ply) — too short. Use a 3-ply line: Bxf7+ Kxf7 Rxd7+.
const FEN = '6k1/3q1p2/8/8/2B5/8/8/3RK3 w - - 0 1';
const LINE = ['Bxf7+', 'Kxf7', 'Rxd7+'];

describe('step 9 — calculate to the end', () => {
  it('keeps a 3–5 move line that ends in a capture, and speaks it', () => {
    const c = withCalculableLine({ fen: FEN, origin: 'puzzle', line: LINE });
    expect(c?.lead).toMatch(/Picture this line without moving anything: .*bishop takes f7.*king takes f7.*rook takes d7/);
  });
  it('drops lines that are too short, too long, or do not end in a capture', () => {
    expect(withCalculableLine({ fen: FEN, origin: 'puzzle', line: ['Rxd7'] })).toBeNull();
    expect(withCalculableLine({ fen: FEN, origin: 'puzzle', line: ['Bb5', 'Qxb5', 'Rd8+', 'Kh7', 'Rd7', 'Qb1+'] })).toBeNull();
    expect(withCalculableLine({ fen: FEN, origin: 'puzzle' })).toBeNull();
  });
  it('the key is the last capture square', () => {
    expect(calculateKey(FEN, { fen: FEN, origin: 'puzzle', line: LINE })?.key).toEqual(['d7']);
    expect(calculateKey(FEN)).toBeNull();
  });
  it('words', () => {
    for (let i = 0; i < 2; i++) expect(calculatePrompt(i)).not.toMatch(/\d/);
    expect(calculateKit().step).toBe('calculate');
  });
});
