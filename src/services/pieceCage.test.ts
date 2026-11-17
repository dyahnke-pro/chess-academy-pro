import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pieceCage } from './pieceCage';

const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('pieceCage — the move takes the squares their knight needs', () => {
  it('32.e4 takes d5: the knight on b6 can only shuttle to a8 (Danya, speedrun S-ZY3)', () => {
    const cage = pieceCage('2k5/p4ppp/NnP1p3/4P3/8/1P2P2P/P4PP1/6K1 w - - 3 32', 'e4', true);
    expect(cage?.knight).toBe('b6');
    expect(cage?.taken).toEqual(['d5']);
    expect(cage?.left).toEqual(['a8']);
    expect(cage?.clause).toMatch(/takes d5 from their knight on b6/);
  });

  it('10.Ne5 adds a guard on c4: the knight on b6 is left only d7 (Danya, S-ZY3)', () => {
    const cage = pieceCage('r1bqr1k1/p1p1bppp/1n2pn2/1P1p4/3P1B2/2NBPN1P/PP3PP1/R2QK2R w KQ - 3 10', 'Ne5', true);
    expect(cage?.taken).toEqual(['c4']);
    expect(cage?.left).toEqual(['d7']);
  });

  it('is said from the other seat about the student\'s knight', () => {
    expect(pieceCage('2k5/p4ppp/NnP1p3/4P3/8/1P2P2P/P4PP1/6K1 w - - 3 32', 'e4', false)?.clause).toMatch(/your knight on b6/);
  });

  it('stays quiet when the move takes nothing from the knight (Kf1 on the same board)', () => {
    expect(pieceCage('2k5/p4ppp/NnP1p3/4P3/8/1P2P2P/P4PP1/6K1 w - - 3 32', 'Kf1', true)).toBeNull();
  });

  it('stays quiet on a knight at its first square — 2…Nc6 hits e5, no cage of the f3 knight', () => {
    expect(pieceCage(after(['e4', 'e5', 'Nf3']), 'Nc6', true)).toBeNull();
  });
});
