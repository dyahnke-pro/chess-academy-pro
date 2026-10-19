import { describe, it, expect } from 'vitest';
import { speedRunReads } from './speedRunReads';

// After 1.e4, Black to move: a knight move and a pawn move of equal value.
const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const LINES = [
  { moves: ['g8f6', 'e4e5'], evaluation: 20, depth: 18, mate: null },
  { moves: ['e7e5', 'g1f3'], evaluation: 25, depth: 18, mate: null },
];

describe('the move-order habit defers to theory (Learn walk 2026-10-19)', () => {
  it('says "flexible move first" off book', () => {
    const r = speedRunReads({ fen: FEN, me: 'b', lines: LINES as never });
    expect(r.some((x) => x.claim === 'srr:flexible-first')).toBe(true);
  });
  it('stays quiet while masters play this position (theory sets the order)', () => {
    const r = speedRunReads({ fen: FEN, me: 'b', lines: LINES as never, inTheory: true });
    expect(r.some((x) => x.claim === 'srr:flexible-first')).toBe(false);
  });
});
