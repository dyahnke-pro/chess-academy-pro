import { describe, it, expect } from 'vitest';
import { findMinorityAttack } from './positionReadingService';

describe('the minority lever never carries a check it does not give (walk 5)', () => {
  it('White\'s b3 read while Black stands in check from Qh4 is "b3", not "b3+"', () => {
    // Black to move after Qh4+: the lever is read with White forced to move.
    const ma = findMinorityAttack('r1br4/1p2kp2/p1n1p3/q1p5/2p4Q/3P4/PPPNNPPP/R3K2R b KQ - 2 15', 'w');
    expect(ma?.leverSan).toBe('b3');
  });
});
