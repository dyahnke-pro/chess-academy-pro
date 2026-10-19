// Their counter-threat is present danger, staked by the one threat computer,
// so a verdict turn never holds it as a warning that can wait (OS-15).
import { describe, it, expect } from 'vitest';
import { counterThreatTeaching } from './learnBoardTeaching';

// David's Learn game, 2026-10-18: his e5 hit the knight on f6 and Black
// answered …Rd8, hitting his queen instead of saving the knight.
const BEFORE_RD8 = 'r3k2r/ppq2ppp/2p2n2/4P3/4P3/2P2B2/P1P3PP/R2Q1RK1 b kq - 0 14';

describe('their counter-threat carries its stakes', () => {
  it('…Rd8 hitting the queen on d1 is staked at what ignoring it costs', () => {
    const t = counterThreatTeaching(BEFORE_RD8, 'Rd8', 'w', null);
    expect(t?.lane).toBe('dangerLevels');
    expect(t?.stakes?.points ?? 0).toBeGreaterThan(0);
  });
});
