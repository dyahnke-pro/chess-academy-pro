import { describe, it, expect } from 'vitest';
import { findColorComplexWeakness } from './positionReadingService';

// Danya article boards 2026-11-18: "your dark squares are weak … their knight
// can settle there" was said on board after board where no piece of theirs
// could reach one of those squares. A colour complex is a weakness only when a
// minor of theirs can get to one of its holes and stay there.
describe('a weak colour complex is one the other side can use', () => {
  it('silent when no minor of theirs reaches a hole: White\'s c3/e3 with Black\'s knights far away', () => {
    const cc = findColorComplexWeakness('r4rk1/p3nqp1/Ppn1p2p/1B1pPp2/1P1P1P2/5N2/3Q2PP/R4RK1 w - - 0 20');
    expect(cc.some((c) => c.side === 'w' && c.complex === 'dark')).toBe(false);
  });
  it('silent when the only hole a piece reaches is on the rim: Nb3 to a5', () => {
    const cc = findColorComplexWeakness('2r3k1/1b3q1p/p3pPpQ/1p2p3/8/PN6/1PP4P/1K3R2 w - - 0 33');
    expect(cc.some((c) => c.side === 'b' && c.complex === 'dark')).toBe(false);
  });
  it('said when their bishop of that colour reaches the holes: opposite-coloured bishops, Black has no light bishop', () => {
    const cc = findColorComplexWeakness('8/4k3/1b3ppp/p2Bp3/4P3/2P3PP/1P2KP2/8 w - - 0 35');
    expect(cc.find((c) => c.side === 'b' && c.complex === 'light')?.by).toBe('bishop');
  });
  it('said when their bishop on the long diagonal sits beside the king: the dark squares round White\'s king', () => {
    const cc = findColorComplexWeakness('2R5/7p/1p2p2k/rb3pq1/5N2/6P1/5bBP/1Q5K w - - 0 34');
    expect(cc.some((c) => c.side === 'w' && c.complex === 'dark')).toBe(true);
  });
});
