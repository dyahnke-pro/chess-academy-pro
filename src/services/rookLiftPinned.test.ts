import { it, expect } from 'vitest';
import { findRookLift } from './positionReadingService';
it('a pinned rook is never told to lift', () => {
  // Claim check 2026-10-18: Rd1 pins the f1 rook to the king on g1.
  expect(findRookLift('1k1r4/2p5/1p3Q2/5p1P/8/8/p1P3P1/3r1RK1 w - - 2 39', 'w')).toBeNull();
});

import { lineWins } from './lineCalc';
it('a line after a capture is counted net of what that capture took', () => {
  // Claim check 2026-10-18: Rxc7 took a pawn; …e5 Bg3 …Qxc7 wins the rook back.
  const fenBefore = '1r1q1rk1/pRp2pbp/4p1p1/8/P2nBBP1/7P/2PQ1PK1/5R2 w - - 3 22';
  const after = '1r1q1rk1/p1R2pbp/4p1p1/8/P2nBBP1/7P/2PQ1PK1/5R2 b - - 0 22';
  const w = lineWins(after, ['e6e5', 'f4g3', 'd8c7'], 'b', undefined, { fenBefore, san: 'Rxc7' }, []);
  expect(w?.what).toMatch(/rook for a pawn/);
});
