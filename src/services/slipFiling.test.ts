import { describe, it, expect } from 'vitest';
import { slipNotFiled, FILED_COST_CAP } from './discussionPractice';
import { positionPosed } from './moveInsight';

// David's own rows, engine-graded at depth 14-16 (2026-10-19 drop). Evals are
// the mover's point of view, in centipawns.
describe('the record keeps only real slips (David drop 2026-10-19)', () => {
  it('a slip in an open game is filed (8.Bxf7+ in the Smith-Morra, ~+0.4 → -2.4)', () => {
    expect(slipNotFiled({ cpLoss: 238, evalBefore: 40, evalAfter: -200 })).toBeNull();
  });

  it('a slip that throws a won game away is filed (46.Nxd6, +5.9 → -4.3)', () => {
    expect(slipNotFiled({ cpLoss: 1000, evalBefore: 590, evalAfter: -434 })).toBeNull();
  });

  it('a slip in a game already decided, still decided after, is not (Re1 at +8.2, cost 0.16)', () => {
    expect(slipNotFiled({ cpLoss: 16, evalBefore: 818, evalAfter: 802 })).toBe('no-cost');
    expect(slipNotFiled({ cpLoss: 112, evalBefore: 388 + 400, evalAfter: 676 })).toBe('decided');
  });

  it('a move the engine rates as good as the best is not a slip (filed 5004, real ~0 at mate-in-hand)', () => {
    expect(slipNotFiled({ cpLoss: 0, evalBefore: 100 })).toBe('no-cost');
  });

  it('costs are capped: a mate score is not a cost', () => {
    expect(FILED_COST_CAP).toBe(1000);
  });
});

describe('"bad trade" is tested only when a trade is on offer', () => {
  it('down a rook with no even capture available: not posed', () => {
    // White: K, R, N vs Black: K, 2R, N — no even capture for White.
    const fen = '1r2k2r/8/8/4n3/8/8/3N4/R3K3 w - - 0 30';
    expect(positionPosed(fen, {}).some((p) => p.tag === 'bad-trade')).toBe(false);
  });
});
