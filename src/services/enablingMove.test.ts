import { describe, it, expect } from 'vitest';
import { findEnablingMove, enablingMoveLine } from './enablingMove';

describe('enablingMove — A first because it opens the road for B', () => {
  it('e3 first opens the f1 bishop’s road to d3 — Bd3 is impossible before it', () => {
    // White: Ke1, Bf1, pawn e2; Black: Ke8, pawn h7. Line e3 … h6, Bd3? No: f1-d3 passes e2.
    const fen = '4k3/7p/8/8/8/8/4P3/4KB2 w - - 0 1';
    const e = findEnablingMove(fen, ['e2e3', 'h7h6', 'f1d3']);
    expect(e?.opened).toBe('e2');
    expect(enablingMoveLine(e!)).toBe('e3 first, then Bd3: right now your bishop on f1 cannot reach d3 — your own piece on e2 is in the way, and e3 clears it.');
  });

  it('silent when B was already playable', () => {
    const fen = '4k3/7p/8/8/8/8/8/4KB2 w - - 0 1';
    expect(findEnablingMove(fen, ['e1e2', 'h7h6', 'f1d3'])).toBeNull();
  });
});
