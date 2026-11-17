import { describe, it, expect } from 'vitest';
import { everyMate, everyMateLine } from './everyMate';

const BH3 = 'rn4k1/pp6/2p1b1pp/3p4/3Pp3/2N1P1b1/PPP4q/R1BQ1K2 b - - 1 19';        // aEKSPFwvFoY, 19…Bh3#
const QC2 = 'rn2k2r/p1pp1ppp/8/1p2p3/P1q1b3/B7/1K1b2PP/R6n b kq - 1 19';          // 0WPNVHZmYE8, 19…Qc2#

describe('everyMate — when one move mates, look for the other', () => {
  it('…Bh3 is mate, and so is …Qf2', () => {
    const e = everyMate(BH3, 'Bh3#');
    expect(e).toEqual({ played: 'Bh3', others: ['Qf2'] });
    expect(everyMateLine(e!, 'your', BH3)).toMatch(/Bh3 and Qf2|so is Qf2/);
  });

  it('stays quiet on the only mate, and on a move that does not mate', () => {
    expect(everyMate(QC2, 'Qc2#')).toBeNull();
    expect(everyMate(BH3, 'Qh1+')).toBeNull();
  });
});
