import { describe, it, expect } from 'vitest';
import { countMethod, countWarning } from './countMethod';

// David 2026-10-28: "This should only fire if a capture is made without the
// correct amount of pieces, or if you move to a square without proper number
// of defense." Review said "Count before you take on d4: three of your pieces
// hit it and two of theirs defend it … the trades come out in your favour"
// before a correct recapture — a forecast on a good move.
describe('count before you take — only after a move that lost the count', () => {
  // d5 is defended by c6 and e6; the knight takes alone.
  const NXD5 = '4k3/8/2p1p3/3p4/8/2N5/8/4K3 w - - 0 1';
  it('a capture on a square they did not outnumber, which lost material', () => {
    const m = countMethod(NXD5, 'Nxd5', 'w', 200);
    expect(m?.square).toBe('d5');
    expect(m?.net).toBeLessThan(0);
    expect(m?.text).toBe('Count before you take on d5: one of your pieces hits it and two of theirs defend it. Not enough — the trades there leave you behind.');
  });
  it('a piece put on a square their pieces outnumber, where it is lost', () => {
    // Nfd5: b6 and f6 hit d5, only the e3 knight guards it.
    const m = countMethod('4k3/8/1n3n2/8/5N2/4N3/8/4K3 w - - 0 1', 'Nfd5', 'w', 250);
    expect(m?.square).toBe('d5');
    expect(m?.text).toBe('Count before you put your knight on d5: two of theirs hit it and only one of yours guards it. Not enough — the knight is lost in the trades.');
  });
  it('a correct capture the count wins says nothing, however the move is priced (negative control)', () => {
    // c-pawn, knight and queen hit d4; two knights defend it — cxd4 is right.
    expect(countMethod('4k3/8/2n5/5n2/3p4/2P2N2/8/3QK3 w - - 0 1', 'cxd4', 'w', 300)).toBeNull();
  });
  it('a sound sacrifice the engine does not price as a mistake says nothing', () => {
    expect(countMethod(NXD5, 'Nxd5', 'w', 20)).toBeNull();
    expect(countMethod(NXD5, 'Nxd5', 'w', null)).toBeNull();
  });
  it('a piece lost to a cheaper attacker is not a count (the count would say it holds)', () => {
    // Ne5 is hit by the d6 pawn and guarded by the d4 pawn: one against one.
    expect(countMethod('4k3/8/3p4/8/3P4/5N2/8/4K3 w - - 0 1', 'Ne5', 'w', 200)).toBeNull();
  });
  it('their move, an unknown move, or a quiet board: nothing', () => {
    expect(countMethod(NXD5, 'Nxd5', 'b', 200)).toBeNull();
    expect(countMethod(NXD5, 'Qh5', 'w', 200)).toBeNull();
    expect(countMethod('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e4', 'w', 200)).toBeNull();
  });
});

describe('the asked form warns only of a capture that loses', () => {
  it('a winning exchange is never offered as a warning', () => {
    expect(countWarning('3qk3/8/4p3/3n4/2P2N2/2N5/8/4K3 w - - 0 1', 'w')).toBeNull();
  });
});
