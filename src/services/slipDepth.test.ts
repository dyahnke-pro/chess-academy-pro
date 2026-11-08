import { describe, it, expect } from 'vitest';
import { holdingMoves, slipBait, refutationOf, slipDepth, HOLD_GAP } from './slipDepth';

describe('slipDepth — the deep reads of a slip', () => {
  it('counts the moves that hold against the best (Lichess inaccuracy line)', () => {
    expect(HOLD_GAP).toBe(0.05);
    // +50, +40 hold; −200 does not.
    expect(holdingMoves([
      { cp: 50, mate: null, pv: ['e2e4'] },
      { cp: 40, mate: null, pv: ['d2d4'] },
      { cp: -200, mate: null, pv: ['g2g4'] },
    ])).toBe(2);
    // Held is judged in winning chances: +9 keeps a forced mate's win, a
    // level game throws it away.
    expect(holdingMoves([
      { cp: null, mate: 3, pv: ['a1a8'] },
      { cp: 900, mate: null, pv: ['a1a7'] },
      { cp: 0, mate: null, pv: ['a1a6'] },
    ])).toBe(2);
  });

  it('names the bait: a capture, a check, a new threat — or nothing', () => {
    // 1.e4 d5: exd5 takes.
    expect(slipBait('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'exd5')).toBe('capture');
    // Bb5+ checks.
    expect(slipBait('rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', 'Bb5+')).toBe('check');
    // A quiet developing move with nothing hit is no bait.
    expect(slipBait('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'Nf3')).toBeNull();
  });

  it('cuts the refutation where the cost lands, in the punisher\'s moves', () => {
    // A knight left on d5 is taken at once.
    const r = refutationOf('4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1', { cp: 900, mate: null, pv: ['d1d5'] });
    expect(r).not.toBeNull();
    expect(r?.moves).toBe(1);
    expect(r?.mate).toBe(false);
    expect(r?.netPawns).toBe(3);
    expect(r?.quietStart).toBe(false);
    // A back-rank mate is a mate, one move deep.
    const m = refutationOf('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', { cp: null, mate: 1, pv: ['a1a8'] });
    expect(m?.mate).toBe(true);
    expect(m?.moves).toBe(1);
  });

  it('claims no depth when the line proves no material and no mate', () => {
    expect(refutationOf('4k3/8/8/8/8/8/8/3QK3 w - - 0 1', { cp: 900, mate: null, pv: ['d1d2'] })).toBeNull();
  });

  it('reads every reason of one move together', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const d = slipDepth(fen, 'Nf3', [{ cp: 30, mate: null, pv: ['e2e4'] }, { cp: 25, mate: null, pv: ['g1f3'] }], null);
    expect(d).toMatchObject({ holds: 2, read: 2, bestQuiet: true, bait: null, refutation: null });
  });
});
