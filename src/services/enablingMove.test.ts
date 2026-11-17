import { describe, it, expect } from 'vitest';
import { findEnablingMove, enablingMoveLine } from './enablingMove';

describe('enablingMove — A first because it opens the road for B', () => {
  it('e3 first opens the f1 bishop’s road to d3 — Bd3 is impossible before it', () => {
    // White: Ke1, Bf1, pawn e2; Black: Ke8, pawn h7. Line e3 … h6, Bd3? No: f1-d3 passes e2.
    const fen = '4k3/7p/8/8/8/8/4P3/4KB2 w - - 0 1';
    const e = findEnablingMove(fen, ['e2e3', 'h7h6', 'f1d3']);
    expect(e?.opened).toBe('e2');
    // Each piece by what it is (one bishop, one e-pawn), f1 and e2 lit.
    expect(enablingMoveLine(e!)).toBe('e3 first, then Bd3: your e-pawn stands in the way of your bishop, and moving it clears the road.');
  });

  it('silent when B was already playable', () => {
    const fen = '4k3/7p/8/8/8/8/8/4KB2 w - - 0 1';
    expect(findEnablingMove(fen, ['e1e2', 'h7h6', 'f1d3'])).toBeNull();
  });
});

describe('the same piece twice is no enabling move', () => {
  it('a queen that steps away and comes back through its own square was never in its own way', () => {
    // Qh6-h7, …Nh5, Qh7xh5: the road h7→h5 runs through h6, where the queen
    // itself stood.
    expect(findEnablingMove('k7/8/5n1Q/8/8/8/8/6K1 w - - 0 1', ['h6h7', 'f6h5', 'h7h5'])).toBeNull();
  });
});

describe('a trade on the square is no road', () => {
  it('d5 exd5 Qxd5: the queen takes back on d5, the push cleared no road for it (gotham-jelena)', () => {
    // White: Kg1, Qd1, pawn d4; Black: Kg8, pawn e6. d5 exd5 Qxd5 — d1–d5 ran through d4.
    expect(findEnablingMove('6k1/8/4p3/8/3P4/8/8/3Q2K1 w - - 0 1', ['d4d5', 'e6d5', 'd1d5'])).toBeNull();
  });
});
