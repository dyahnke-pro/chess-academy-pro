import { describe, it, expect } from 'vitest';
import { mutualRestriction } from './squareJudgement';

// Danya speedrun LJa5Df75CJI, 8…dxe4: "Their knight on h3 blocks your
// light-squared bishop" — h3 is the end of the c8 bishop's diagonal; it blocks
// nothing.
describe('a knight at the end of the diagonal blocks nothing', () => {
  it('Nh3 against the c8 bishop is no mutual restriction', () => {
    expect(mutualRestriction('rnbq1rk1/pp3pp1/2pb1n1p/4p3/4p3/1BN4N/PPPP1PPP/R1BQK2R w KQ - 0 9', 'b')).toBeNull();
  });
});
