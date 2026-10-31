import { describe, it, expect } from 'vitest';
import { counterThreat, counterThreatLine } from './counterThreat';

// David's Learn game, 2026-10-18 22:05: his e5 hit the knight on f6, and Black
// answered …Rd8, hitting his queen instead of saving the knight.
const BEFORE_RD8 = 'r3k2r/ppq2ppp/2p2n2/4P3/4P3/2P2B2/P1P3PP/R2Q1RK1 b kq - 0 14';

describe('danger levels — answering a threat with a bigger one', () => {
  it('names the piece left and the bigger piece hit, with the line that proves it', () => {
    const c = counterThreat(BEFORE_RD8, 'Rd8');
    expect(c?.left).toEqual({ piece: 'n', square: 'f6' });
    expect(c?.hit.piece).toBe('q');
    expect(c?.hit.square).toBe('d1');
    expect(c?.line?.sans).toEqual(['exf6', 'Rxd1']);
    const line = counterThreatLine(c!, false);
    expect(line).toMatch(/^They left their knight on f6 and hit your queen on d1 instead/);
    expect(line).toMatch(/danger levels/);
    expect(line).toMatch(/exf6 wins a knight, but Rxd1 costs you your queen\./);
  });
  it('NEGATIVE CONTROL: saving the knight is not a counter-threat', () => {
    expect(counterThreat(BEFORE_RD8, 'Nd5')).toBeNull();
  });
  it('NEGATIVE CONTROL: no piece was attacked, so nothing was left', () => {
    expect(counterThreat('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'e5')).toBeNull();
  });
});
