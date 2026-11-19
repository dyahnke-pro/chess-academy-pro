import { describe, it, expect } from 'vitest';
import { detectNewThreat } from './groundedAnswer';

// Danya speedrun FozbGMUOOjs, 27.Ne7: "You're now threatening Qc6+ — it forks
// the king and queen on d6." …Qxc6 Nxc6 swaps queens: the fork wins nothing.
describe('a fork the forked piece simply trades off is no fork', () => {
  it('27.Ne7 does not threaten a Qc6+ fork', () => {
    const t = detectNewThreat('2R2b1r/r2k1p1p/1p1qpP2/3N1p2/p2P2P1/4BQ1P/P4R2/6K1 w - - 1 27', '2R2b1r/r2kNp1p/1p1qpP2/5p2/p2P2P1/4BQ1P/P4R2/6K1 b - - 2 27', 'w');
    expect(t?.san === 'Qc6+' && /fork/.test(t.detail)).toBe(false);
  });
});

// G4.5: a fork of the king, queen AND rook names every piece it hits, never the
// king and the first major alone.
describe('a royal fork names every piece it hits', () => {
  it('Nd5 threatens Nf6+ forking king, queen and rook — all three said', () => {
    const t = detectNewThreat('4r1k1/3q4/8/8/1N6/8/8/K7 w - - 0 1', '4r1k1/3q4/8/3N4/8/8/8/K7 b - - 1 1', 'w');
    expect(t?.kind).toBe('fork');
    expect(t?.targets).toEqual(['king', 'rook on e8', 'queen on d7']);
    expect(t?.targetSquares).toEqual(['g8', 'e8', 'd7']);
    expect(t?.detail).toMatch(/king, rook on e8 and queen on d7/);
  });
});
