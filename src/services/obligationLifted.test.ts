// An obligation lifts (teach-brief §3): their move takes an attacker away, so a
// piece the student had to look after is free.
import { describe, it, expect } from 'vitest';
import { obligationLifted, obligationLiftedLine } from './obligationLifted';

// White's bishop on b5 hits Black's undefended knight on c6.
const BEFORE = 'r3k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1';
const RETREAT = 'r3k3/8/2n5/8/8/8/4B3/4K3 b - - 1 1';     // Be2 — off the diagonal
const STAYS = 'r3k3/8/2n5/8/B7/8/8/4K3 b - - 1 1';       // Ba4 — still on it

describe('obligationLifted — their move frees a piece you had to guard', () => {
  it('the bishop leaves the knight alone: the duty is gone, and said in the student\'s seat', () => {
    const o = obligationLifted(BEFORE, RETREAT, 'b');
    expect(o).toMatchObject({ square: 'c6', piece: 'n', from: 'b5', to: 'e2', theirPiece: 'b' });
    expect(obligationLiftedLine(o!)).toBe('Their bishop left b5, so your knight on c6 is no longer under fire — you don\'t have to spend a move guarding it now.');
  });
  it('a retreat that still hits the piece lifts nothing', () => {
    expect(obligationLifted(BEFORE, STAYS, 'b')).toBeNull();
  });
  it('no duty before, nothing to lift', () => {
    expect(obligationLifted('r3k3/8/2n5/8/8/8/8/1B2K3 w - - 0 1', 'r3k3/8/2n5/8/8/8/4B3/4K3 b - - 1 1', 'b')).toBeNull();
  });
});
