import { describe, it, expect } from 'vitest';
import { kingSafetyRead } from './positionReadingService';
import { detectKingExposure, shieldCount } from './kingSafety';

// ONE SHIELD COUNT (one-coach P2, census group 12): a pawn one step ahead of
// its shelter square still shelters — the 09-30 fix that never reached chat.
describe('the king shield is counted one way', () => {
  const FIANCHETTO = 'rnbq1rk1/ppppppbp/6pp/8/8/5NP1/PPPPPPBP/RNBQ1RK1 w - - 0 6';
  it('g6 + h6 in front of a g8 king are still the shield', () => {
    expect(shieldCount(FIANCHETTO, 'b')?.present).toBe(3);
    expect(kingSafetyRead(FIANCHETTO, 'b')?.shieldPawns).toBe(3);
    expect(kingSafetyRead(FIANCHETTO, 'b')?.exposed).toBe(false);
    expect(detectKingExposure(FIANCHETTO, 'b')).toBeNull();
  });
});
