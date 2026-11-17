import { describe, it, expect } from 'vitest';
import { opensCheck } from './opensCheck';

// aEKSP 13…Ne4 (Danya): "moving the knight from f6 also opens the queen's
// d8–h4 diagonal, so …Qh4+ comes next" — played: Bxe4 fxe4 Rf1 Qh4+.
const FEN = 'rn1q1rk1/pp6/2pbbnpp/3p1p2/3P4/2N1PB2/PPP3PP/R1BQK2R b KQ - 0 13';

describe('opensCheck — the move clears a check, then it is given', () => {
  it('…Ne4 opens the queen\'s diagonal to h4, and …Qh4+ came a move later', () => {
    const o = opensCheck(FEN, 'Ne4', ['Bxe4', 'fxe4', 'Rf1', 'Qh4+', 'g3'], true, 'past');
    expect(o?.piece).toBe('queen');
    expect(o?.to).toBe('h4');
    expect(o?.check).toBe('…Qh4+');
    expect(o?.movesLater).toBe(2);
    expect(o?.clause).toMatch(/h4/);
    expect(o?.clause).toMatch(/came a move later/);
  });

  it('speaks in the tense asked', () => {
    expect(opensCheck(FEN, 'Ne4', ['Bxe4', 'fxe4', 'Rf1', 'Qh4+'], true, 'now')?.clause).toMatch(/comes a move later/);
  });

  it('stays quiet when the check is never given in the line', () => {
    expect(opensCheck(FEN, 'Ne4', ['Bxe4', 'fxe4', 'Rf1', 'Qg5'], true, 'past')).toBeNull();
  });

  it('leaves the check on the very next move to the deep fact (2…c6, then …Qa5+ at once)', () => {
    expect(opensCheck('rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2', 'c6', ['dxe5', 'Qa5+', 'Nc3'], true, 'past')).toBeNull();
  });

  it('stays quiet when the move does not clear the line (…Nbd7, the knight on f6 still blocks)', () => {
    expect(opensCheck(FEN, 'Nbd7', ['Qd3', 'Kh7', 'Bd2', 'Qe7'], true, 'past')).toBeNull();
  });
});
