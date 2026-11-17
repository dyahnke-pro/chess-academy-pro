import { describe, expect, it } from 'vitest';
import { chainBase } from './chainBase';

describe('chainBase', () => {
  // Danya, lyUZn39V6TY 18...Bh6: "f4 is the base of the chain; if it falls e3
  // follows, so guard it with ...Bh6."
  const FEN = 'r3kb1r/1p3p2/2n3b1/1p2P2p/2p2p1P/P1P1pP2/1P2N1P1/RN2KB1R b KQkq - 1 18';
  it('names the base it guards and the pawn it holds', () => {
    const r = chainBase(FEN, 'Bh6', true);
    expect(r?.act).toBe('guarded');
    expect(r?.text).toMatch(/bishop on h6/);
    expect(r?.text).toMatch(/f4, the (pawn at the )?base of your (pawn )?chain/);
    expect(r?.text).toMatch(/e3/);
  });
  it('says the knight that hits it, from the other seat', () => {
    const r = chainBase('r3kb1r/1p3p2/2n3b1/1p2P2p/2p2p1P/P1P1pPN1/1P4P1/RN2KB1R w KQkq - 0 18', 'Ne2', false);
    expect(r?.act).toBe('hit');
    expect(r?.text).toMatch(/Their knight on e2/);
    expect(r?.text).toMatch(/your (pawn )?chain/);
  });
  it('is quiet when nothing attacks the base', () => {
    expect(chainBase('r3kb1r/1p3p2/2n3b1/1p2P2p/2p2p1P/P1P1pP2/1P4P1/RNN1KB1R b KQkq - 1 18', 'Bh6', true)).toBeNull();
  });
  it('is quiet when the base pawn is guarded by a pawn (no base)', () => {
    expect(chainBase('r3kb1r/1p3p2/2n3b1/1p2P1pp/2p2p2/P1P1pP2/1P2N1P1/RN2KB1R b KQkq - 1 18', 'Bh6', true)).toBeNull();
  });
});
