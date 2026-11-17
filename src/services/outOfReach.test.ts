import { describe, it, expect } from 'vitest';
import { outOfReach, outOfReachLine } from './outOfReach';

const BA4 = '6k1/p1r2p1p/4p1p1/8/8/2r2B2/P1b2PPP/2R1R1K1 b - - 5 21';               // kYbh2NTFsS8, 21…Ba4
const QA6 = 'r2r2k1/p1p1qppp/1nP1p3/4P3/2Q5/2N1P2P/PP3PP1/R2R2K1 w - - 3 21';      // S-ZY3NtFO20, 21.Qa6

describe('outOfReach — put the piece where nothing can chase it', () => {
  it('…Ba4: no pawn can kick it there, where g4 would have chased it on f5', () => {
    const o = outOfReach(BA4, 'Ba4', ['c2f5', 'c2a4']);
    expect(o).toMatchObject({ piece: 'b', square: 'a4', contrast: { square: 'f5', chase: { move: 'g4' }, left: false } });
    expect(outOfReachLine(o!, 'your', BA4)).toMatch(/On f5, g4 would have chased it\./);
  });

  it('Qa6: nothing smaller can hit it, where the knight on b6 hit it on c4', () => {
    const o = outOfReach(QA6, 'Qa6', []);
    expect(o).toMatchObject({ piece: 'q', square: 'a6', contrast: { square: 'c4', chase: { now: { square: 'b6', piece: 'n' } }, left: true } });
  });

  it('stays quiet on a chaseable square, and with nothing to weigh it against', () => {
    // …Bf5: g4 kicks it.
    expect(outOfReach(BA4, 'Bf5', ['c2a4'])).toBeNull();
    // …Ba4 with no other square weighed: c2 was not chased either.
    expect(outOfReach(BA4, 'Ba4', [])).toBeNull();
  });
});
