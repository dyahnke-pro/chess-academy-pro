// A capture that simply loses the piece is not a trade to "look past" (OS-11
// g4, 16…Qxe4: "Before you take on g2, look past the trade … a pin" when
// …Qxg2+ Kxg2 just loses the queen).
import { describe, it, expect } from 'vitest';
import { detectTradeCreatesPin } from './latentDanger';

describe('detectTradeCreatesPin — only a real trade', () => {
  it('…Qxg2+ met by Kxg2 loses the queen: no pin warning', () => {
    expect(detectTradeCreatesPin('4k3/1Q6/2p5/8/4q3/8/6P1/6K1 b - - 0 1', 'b')).toBeNull();
  });
  it('with g2 covered (…h3), the capture holds and the pin it walks into is warned', () => {
    const d = detectTradeCreatesPin('4k3/1Q6/2p5/8/4q3/7p/6P1/6K1 b - - 0 1', 'b');
    expect(d?.tradeTo).toBe('g2');
    expect(d?.frontSquare).toBe('c6');
  });
});
