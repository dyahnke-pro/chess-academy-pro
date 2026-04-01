import { describe, it, expect } from 'vitest';
import { uciMoveToSan, uciLinesToSan } from './uciToSan';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('uciMoveToSan', () => {
  it('converts e2e4 to e4', () => {
    expect(uciMoveToSan('e2e4', START_FEN)).toBe('e4');
  });

  it('converts g1f3 to Nf3', () => {
    expect(uciMoveToSan('g1f3', START_FEN)).toBe('Nf3');
  });

  it('returns UCI unchanged on invalid move', () => {
    expect(uciMoveToSan('z9z9', START_FEN)).toBe('z9z9');
  });
});

describe('uciLinesToSan', () => {
  it('converts a line with move numbers', () => {
    const result = uciLinesToSan(['e2e4', 'e7e5', 'g1f3'], START_FEN);
    expect(result).toBe('1.e4 e5 2.Nf3');
  });

  it('limits to maxMoves', () => {
    const result = uciLinesToSan(['e2e4', 'e7e5', 'g1f3', 'b8c6'], START_FEN, 2);
    expect(result).toBe('1.e4 e5');
  });

  it('handles black to move with move number prefix', () => {
    const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const result = uciLinesToSan(['e7e5', 'g1f3'], afterE4);
    expect(result).toBe('1...e5 2.Nf3');
  });

  it('returns UCI fallback on invalid move', () => {
    const result = uciLinesToSan(['z9z9', 'a1a2'], START_FEN);
    expect(result).toBe('z9z9 a1a2');
  });
});
