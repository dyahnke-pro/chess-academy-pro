import { describe, expect, it } from 'vitest';
import { pinnedPawnGuard } from './pinnedPawnGuard';

describe('pinnedPawnGuard', () => {
  // Danya, -Am8glebGwQ 27.Rc6: "f7 is pinned to the king, so e6 is weak; Rc6
  // threatens Rxe6+."
  it('says the e6 pawn\'s guard on f7 is pinned', () => {
    const r = pinnedPawnGuard('3qkr2/p2n1p2/1p2pP2/3pNp1Q/1P1P4/P6P/5PP1/2R3K1 w - - 1 27', 'Rc6', true);
    expect(r?.text).toMatch(/Your rook hits/);
    expect(r?.text).toMatch(/e6/);
    expect(r?.text).toMatch(/f7/);
    expect(r?.text).toMatch(/pinned to the king/);
    expect(r?.squares).toEqual(['c6', 'e6', 'f7', 'h5']);
  });
  it('is quiet when the queen does not pin the f-pawn', () => {
    expect(pinnedPawnGuard('3qkr2/p2n1p2/1p2pP2/3pNp2/1P1P3Q/P6P/5PP1/2R3K1 w - - 1 27', 'Rc6', true)).toBeNull();
  });
});
