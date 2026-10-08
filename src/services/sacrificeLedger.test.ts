import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { sacrificeLedger, type BestAmong } from './sacrificeLedger';

// Greek gift shape: White's Bxh7+ — Black can take (Kxh7) or decline (Kh8).
const before = 'r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R2QK2R w KQ - 0 8';
const after = (() => { const c = new Chess(before); c.move('Bxh7+'); return c.fen(); })();

/** A scripted engine: a fixed score for the capture set and the decline set. */
const engine = (takeCp: number, declineCp: number): BestAmong => async (_fen, ucis) => {
  const isTake = ucis.includes('g8h7');
  return isTake
    ? { evaluation: takeCp, mate: null, moves: ['g8h7', 'f3g5', 'h7g8', 'd1h5'] }
    : { evaluation: declineCp, mate: null, moves: [ucis.includes('g8h8') ? 'g8h8' : ucis[0], 'd1d3'] };
};

describe('sacrificeLedger', () => {
  it('names both branches when the sacrifice holds either way', async () => {
    const r = await sacrificeLedger(after, 'h7', 'w', engine(350, 120));
    expect(r?.text).toBe('The sacrifice holds either way: if they take with Kxh7 you are winning, and if they decline with Kh8 you are better — at worst better.');
  });
  it('one band when both branches agree', async () => {
    const r = await sacrificeLedger(after, 'h7', 'w', engine(20, -10));
    expect(r?.text).toBe('The sacrifice holds either way: if they take with Kxh7 or decline with Kh8, you are about level.');
  });
  it('silent when either branch leaves you worse', async () => {
    expect(await sacrificeLedger(after, 'h7', 'w', engine(-200, 150))).toBeNull();
    expect(await sacrificeLedger(after, 'h7', 'w', engine(400, -120))).toBeNull();
  });
  it('silent when the engine gives no line', async () => {
    expect(await sacrificeLedger(after, 'h7', 'w', async () => null)).toBeNull();
  });
});
