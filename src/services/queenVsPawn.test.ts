import { describe, it, expect } from 'vitest';
import { queenVsSeventh } from './queenVsPawn';

describe('queenVsSeventh', () => {
  it('a centre pawn on the seventh loses to the queen', () => {
    const r = queenVsSeventh('8/8/8/8/8/2Q5/3pk3/7K w - - 0 1');
    expect(r?.kind).toBe('centre-or-knight');
    expect(r?.expect).toBe('win');
    expect(r?.text).toMatch(/centre pawn on the seventh wins/);
  });
  it('a bishop pawn on the seventh is usually a draw', () => {
    const r = queenVsSeventh('8/8/8/8/8/4Q3/2pk4/K7 w - - 0 1');
    expect(r?.kind).toBe('rook-or-bishop');
    expect(r?.text).toMatch(/bishop pawn.*stalemate/);
  });
  it('silent when the pawn is not on the seventh or its king is away', () => {
    expect(queenVsSeventh('8/8/8/8/3p4/2Q5/4k3/7K w - - 0 1')).toBeNull();
    expect(queenVsSeventh('8/8/8/8/8/2Q5/3p4/4k2K w - - 0 1')?.pawn ?? null).toBe('d2');
    expect(queenVsSeventh('k7/8/8/8/8/2Q5/3p4/7K w - - 0 1')).toBeNull();
  });
});
