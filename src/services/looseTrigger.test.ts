import { describe, it, expect } from 'vitest';
import { looseTrigger } from './looseTrigger';
import { liveMethodBeat } from './methodBeat';

describe('trigger → scan: a loose piece the quiet best move hits', () => {
  const FEN = '4k3/8/8/1b6/8/8/8/3QK3 w - - 0 1';
  it('names the loose piece the move goes after', () => {
    expect(looseTrigger(FEN, 'Qd3')).toBe('their bishop on b5');
  });
  it('silent for a forcing move, a move that misses it, or a defended piece (negative controls)', () => {
    expect(looseTrigger(FEN, 'Qh5+')).toBeNull();
    expect(looseTrigger(FEN, 'Qd2')).toBeNull();
    expect(looseTrigger('4k3/8/p7/1b6/8/8/8/3QK3 w - - 0 1', 'Qd3')).toBeNull();   // …a6 defends it
  });
  it('the habit speaks once, at a deciding moment only', () => {
    const base = { bestSan: 'Qd3', threatStanding: false, isStudentMove: true, looseTarget: 'their bishop on b5' };
    expect(liveMethodBeat({ ...base, tier: 'critical' })?.key).toBe('method:loose-trigger');
    expect(liveMethodBeat({ ...base, tier: 'none' })).toBeNull();
    expect(liveMethodBeat({ ...base, tier: 'critical' }, 0, new Set(['method:loose-trigger']))).toBeNull();
  });
});
