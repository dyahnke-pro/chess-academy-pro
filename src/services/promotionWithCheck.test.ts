import { describe, expect, it } from 'vitest';
import { promotionWithCheck } from './promotionWithCheck';

// Mitrofanov's study (the-importance-of-solving-studies#1): "1.b6+ drives the king to the eighth
// rank so every White promotion later comes with check".
const STUDY = '8/k7/P2b2P1/KP1Pn2P/4R3/8/6np/8 w - - 0 1';

describe('promotionWithCheck', () => {
  it('b6+ puts the king on a8, so g8=Q comes with check', () => {
    const r = promotionWithCheck(STUDY, 'b6+', 'a7a8');
    expect(r?.kingTo).toBe('a8');
    expect(r?.pawn).toBe('g6');
    expect(r?.queens).toBe('g8');
    expect(r?.text).toContain('drives their king to a8');
  });
  it('stays silent on a quiet move and when the king has a reply off the rank', () => {
    expect(promotionWithCheck(STUDY, 'g7', null)).toBeNull();
    expect(promotionWithCheck('8/8/4k1P1/8/8/8/8/R3K3 w - - 0 1', 'Ra6+', null)).toBeNull();
  });
});
