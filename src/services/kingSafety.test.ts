import { describe, it, expect } from 'vitest';
import { detectKingExposure, kingExposureClause } from './kingSafety';

describe('detectKingExposure — broken shelter AND real attackers, board-true', () => {
  it('fires on a castled king with a broken shield under fire', () => {
    // White Kg1; f2 and g2 pawns gone (only h2 left), a Black rook on g8 and
    // queen on h4 bearing on the king zone.
    const fen = '5rk1/8/8/8/7q/8/7P/5RK1 w - - 0 1';
    const k = detectKingExposure(fen, 'w');
    expect(k).not.toBeNull();
    expect(k?.missingShield).toBeGreaterThanOrEqual(2);
    expect(k?.attackerSquares.length).toBeGreaterThanOrEqual(1);
    expect(kingExposureClause(k!)).toMatch(/king's cover is thin/i);
  });

  it('stays silent when the shield is broken but NOBODY is attacking (no overstating)', () => {
    // Same broken shield, but Black has only a king — no pressure.
    const fen = '6k1/8/8/8/8/8/7P/5RK1 w - - 0 1';
    expect(detectKingExposure(fen, 'w')).toBeNull();
  });

  it('stays silent when the shield is intact even under some pressure', () => {
    // Full f2/g2/h2 shelter; a lone enemy rook on the g-file is not exposure.
    const fen = '6r1/6k1/8/8/8/8/5PPP/5RK1 w - - 0 1';
    expect(detectKingExposure(fen, 'w')).toBeNull();
  });

  it('returns null for an uncastled / central king', () => {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    expect(detectKingExposure(fen, 'w')).toBeNull();
  });
});
