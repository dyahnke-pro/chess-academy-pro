import { describe, expect, it } from 'vitest';
import { assembleKingSafetyAnswer } from './groundedAnswer';

describe('assembleKingSafetyAnswer — says only what it checked', () => {
  it('names an open file beside the king instead of "no open lines" (walk 2026-09-30, game 1)', () => {
    const a = assembleKingSafetyAnswer('6k1/p1p2p2/2p4p/8/8/8/PPP2PPP/3Q2K1 b - - 0 1', 'black', 'me');
    expect(a?.facts).toMatch(/g-file beside it is open/);
    expect(a?.facts).not.toMatch(/no open lines/);
  });
  it('a full shelter reads safe', () => {
    // A rook on a8 guards the back rank, so there is no Qd8#.
    const a = assembleKingSafetyAnswer('r5k1/5ppp/8/8/8/8/5PPP/3Q2K1 b - - 0 1', 'black', 'me');
    expect(a?.facts).toMatch(/looks safe/);
  });
  it('the same shelter with the back rank open names the mate (hard walk 2026-10-10)', () => {
    const a = assembleKingSafetyAnswer('6k1/5ppp/8/8/8/8/5PPP/3Q2K1 b - - 0 1', 'black', 'me');
    expect(a?.facts).toBe('Your king is not safe: they threaten Qd8# — mate.');
  });
});
