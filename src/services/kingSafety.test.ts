import { describe, it, expect } from 'vitest';
import { detectKingExposure, kingExposureClause, detectCentralKingDanger } from './kingSafety';

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

describe('detectCentralKingDanger — the delayed-castling "castle now" moment', () => {
  it('fires: uncastled central king + central tension + an enemy rook down the king file', () => {
    // White Ke1; e4 pawn in contact with Black d5; Black rook on e8 aimed down
    // the e-file that opening the centre would unmask.
    const d = detectCentralKingDanger('4r1k1/8/8/3p4/4P3/8/8/4K3 w - - 0 12', 'w');
    expect(d).not.toBeNull();
    expect(d?.kingSquare).toBe('e1');
    expect(d?.aimedFrom).toBe('e8');
  });

  it('silent when no enemy heavy is aimed down the king file (calm development)', () => {
    // Same tension, but the rook is on the a-file — opening the centre exposes nothing.
    expect(detectCentralKingDanger('r5k1/8/8/3p4/4P3/8/8/4K3 w - - 0 12', 'w')).toBeNull();
  });

  it('silent on a LOCKED centre — no pawn contact to crack open (KID/French class)', () => {
    // e4 vs e5 are blocked head-to-head, not in capturing contact → no tension.
    expect(detectCentralKingDanger('4r1k1/8/8/4p3/4P3/8/8/4K3 w - - 0 12', 'w')).toBeNull();
  });

  it('silent once the king has castled out of the centre', () => {
    expect(detectCentralKingDanger('4r1k1/8/8/3p4/4P3/8/8/5RK1 w - - 0 12', 'w')).toBeNull();
  });
});
