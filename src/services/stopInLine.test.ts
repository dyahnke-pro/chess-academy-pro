// The "pass in your head" test reads the held engine line, not one move.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { stopInLine } from './stopInLine';
import { stopReason } from './moveIntent';

// The closest saved board to the plan's Rd1 / …e5 dxe6 case (g
// chesscom-1018863294 ply 21): after 11.Qd4 the one-move check says …e5 is
// stopped ("you cover e5 twice to their one"); the saved read after …e5 plays
// dxe6 e.p. …fxe6 — a trade, nothing lost.
const before = 'r3kb1r/pp1bpppp/5nn1/q2P4/5B2/2N1Q3/PP3PPP/R3KBNR w KQkq - 3 11';
const after = (() => { const c = new Chess(before); c.move('Qd4'); return c.fen(); })();

describe('stopInLine', () => {
  it('the line and the one-move check disagree on …e5: say nothing', () => {
    const one = stopReason(after, 'e7e5', 'w');
    expect(one).toMatch(/cover e5/);
    expect(stopInLine({ fenAfter: after, stoppedUci: 'e7e5', stopper: 'w', stoppedCostCp: 124,
      lineAfterStopped: ['d5e6', 'f7e6', 'f1d3', 'g6f4', 'd4f4', 'f6d5', 'f4e5'], oneMoveFails: !!one })).toBe('disagrees');
  });
  it('a stopped move the line punishes agrees: …Qxd5 is taken by the knight', () => {
    // After Qd4, …Qxd5?? is met by Nxd5: the line wins their queen.
    expect(stopInLine({ fenAfter: after, stoppedUci: 'a5d5', stopper: 'w', stoppedCostCp: 900,
      lineAfterStopped: ['c3d5', 'f6d5', 'd4d5'], oneMoveFails: true })).toBe('agrees');
  });
  it('no held read: no-line (the caller keeps the one-move check)', () => {
    expect(stopInLine({ fenAfter: after, stoppedUci: 'e7e5', stopper: 'w', stoppedCostCp: null, lineAfterStopped: null, oneMoveFails: true })).toBe('no-line');
  });
});
