import { describe, expect, it } from 'vitest';
import { seventhRankMate } from './seventhRankMate';

// Danya have-check board rooks-on-the-seventh-revisited#0: "as long as the king
// makes contact with one of the rooks, White will never be able to deliver
// checkmate on the eighth rank". The engine's top line as dumped (White's view).
const L = [{ moves: ['g7a7', 'f8g8', 'a7a8', 'g8h7'], cp: 511, mate: null }];
const TRS = 'r4k2/6RR/8/8/8/8/8/6K1 w - - 0 1';

describe('seventhRankMate', () => {
  it('reads the Danya board: the rook on a8 guards the back rank, the king touches the g7 rook', () => {
    const r = seventhRankMate(TRS, L, 'w');
    expect(r?.guard).toBe('a8');
    expect(r?.touched).toBe('g7');
    expect(r?.text).toContain('their rook on a8 guards the back rank');
  });
  it('from the defender\'s seat it is the defence to keep', () => {
    expect(seventhRankMate(TRS, L, 'b')?.text).toContain('Keep it that way: the eighth rank guarded');
  });
  it('stays silent where a check mates (no rook on the eighth, the king off the rooks)', () => {
    expect(seventhRankMate('5k2/R6R/8/8/8/8/8/6K1 w - - 0 1', null, 'w')).toBeNull();
  });
  it('stays silent where the engine finds a mate in three', () => {
    expect(seventhRankMate(TRS, [{ moves: ['g7a7'], cp: null, mate: 3 }], 'w')).toBeNull();
  });
});
