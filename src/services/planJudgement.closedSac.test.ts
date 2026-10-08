import { describe, expect, it } from 'vitest';
import { closedTacticalChance } from './planJudgement';

// Keep tactical chances in a closed position (missed computers, 2026-10-08).
// c3-d4-e5 locked against c4-d5-e6; the bishop on c2 eyes h7.
const fen = 'r1bq1rk1/5ppp/4p3/3pP3/2pP4/2P2N2/PPB2PPP/R2Q1RK1 w - - 0 12';

describe('closedTacticalChance', () => {
  it('names the sacrifice the engine line keeps in a locked position', () => {
    const r = closedTacticalChance(fen, 'a3', 'w', ['a2a3', 'c8d7', 'c2h7', 'g8h7', 'f3g5'], 0);
    expect(r?.text).toBe('With the pawns locked, the chances here are tactical: this line keeps a sacrifice in the air — Bxh7 comes later, and they take it.');
  });
  it('silent when they decline the sacrifice in the line', () => {
    expect(closedTacticalChance(fen, 'a3', 'w', ['a2a3', 'c8d7', 'c2h7', 'g8h8', 'f3g5'], 0)).toBeNull();
  });
  it('silent when the position is open', () => {
    const open = 'r1bq1rk1/5ppp/8/8/8/5N2/PPB2PPP/R2Q1RK1 w - - 0 12';
    expect(closedTacticalChance(open, 'a3', 'w', ['a2a3', 'c8d7', 'c2h7', 'g8h7', 'f3g5'], 0)).toBeNull();
  });
});
