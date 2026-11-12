import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { givesUp, lineDiff, pawnCanEverCover, planItem } from './consequences';

const after = (...sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('givesUp — what a pawn move gives up for good', () => {
  it('…g6 gives up nothing yet after 1.e4: h6 can never be covered again, but no white piece can reach it', () => {
    expect(givesUp(after('e4'), 'g6')).toEqual([]);
  });

  it('bxc3 gives up a3 to no one and c3 is not a hole while its own pawn stands there (Four Knights)', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bb5 Bb4 5.O-O O-O 6.d3 Bxc3 7.bxc3
    expect(givesUp(after('e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5', 'Bb4', 'O-O', 'O-O', 'd3', 'Bxc3'), 'bxc3')).toEqual([]);
  });

  it('…f6 gives up nothing: e6 and g6 can still be covered by the d- and h-pawns', () => {
    expect(givesUp(after('e4'), 'f6')).toEqual([]);
  });

  it('names the minor piece that can reach the lost square: 1.d4 Nf6 2.Nf3 g6 — Bh6 at once', () => {
    const g = givesUp(after('d4', 'Nf6', 'Nf3'), 'g6');
    expect(g).toEqual([{ square: 'h6', reachedBy: ['the bishop on c1 (one move)'] }]);
  });

  it('…h6 gives up nothing while the f-pawn still covers g6', () => {
    expect(givesUp(after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3'), 'h6')).toEqual([]);
  });

  it('no road through a square the mover\'s own pawn covers: Scotch …c6 leaves d6, but the knight cannot go via b5', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.d4 exd4 5.Nxd4 Bb4 6.Nxc6 bxc6 7.Bd3 d5 8.exd5 cxd5 9.O-O O-O 10.Bg5 c6
    const g = givesUp(after('e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'exd4', 'Nxd4', 'Bb4', 'Nxc6', 'bxc6', 'Bd3', 'd5', 'exd5', 'cxd5', 'O-O', 'O-O', 'Bg5'), 'c6');
    expect(g.flatMap((x) => x.reachedBy).some((r) => r.includes('via b5'))).toBe(false);
  });

  it('a piece move gives up nothing by this measure', () => {
    expect(givesUp(after('e4'), 'Nf6')).toEqual([]);
  });

  it('pawnCanEverCover reads a pawn behind on a neighbouring file', () => {
    const c = new Chess(after('e4', 'g6'));
    expect(pawnCanEverCover(c, 'f6', 'b')).toBe(true);
    expect(pawnCanEverCover(c, 'h6', 'b')).toBe(false);
  });
});

describe('lineDiff — where a line leads', () => {
  it('a passer the line\'s first move did not make is said with the move that made it (Scotch main e5: …f5 makes it)', () => {
    // Before …f5, the f7 pawn stands in front of e5's neighbour file: e5 is
    // not passed. The sheet said "you get a passed pawn (e5)" as if e5 did it.
    const fen = '2br1rk1/2p2ppp/p1n2q2/1p6/2p1PP2/2P5/PPBNQ1PP/R4RK1 w - - 0 17';
    const d = lineDiff(fen, ['e4e5', 'f6h4', 'd2e4', 'c6e7', 'e4g3', 'f7f5', 'e2f2', 'h4h6'], 'w');
    expect(d?.facts).toContain('you get a passed pawn (e5, once …f5 is played)');
    expect(d?.facts).not.toContain('you get a passed pawn (e5)');
  });

  it('NEGATIVE CONTROL: a passer the first move makes carries no maker', () => {
    // 1.e4 d5 2.exd5 — a white pawn on d5 with the c- and e-pawns still home
    // is not passed; take the c- and e-pawns away and exd5 passes it at once.
    const d = lineDiff('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', ['e4d5', 'e8d7'], 'w');
    expect(d?.facts).toContain('you get a passed pawn (d5)');
  });

  it('the Scandinavian exchange: a pawn each, the e-file half-open for White, the d-file for Black', () => {
    const d = lineDiff(new Chess().fen(), ['e2e4', 'd7d5', 'e4d5', 'd8d5'], 'w');
    expect(d?.sans).toEqual(['e4', 'd5', 'exd5', 'Qxd5']);
    expect(d?.facts).toContain('off the board: yours a pawn; theirs a pawn');
    expect(d?.facts).toContain('half-open for you (no pawn of yours on it): e-file');
    expect(d?.facts).toContain('half-open for them: d-file');
    expect(d?.facts.some((f) => f.startsWith('material'))).toBe(false);
  });

  it('reads the queens coming off and the king that took back', () => {
    // 1.d4 d5 2.c4 dxc4 3.e4 e5 4.dxe5 Qxd1+ 5.Kxd1
    const d = lineDiff(new Chess().fen(), ['d2d4', 'd7d5', 'c2c4', 'd5c4', 'e2e4', 'e7e5', 'd4e5', 'd8d1', 'e1d1'], 'w', 10);
    expect(d?.facts).toContain('the queens are off');
    expect(d?.facts.some((f) => f.includes('your king on d1'))).toBe(true);
  });

  it('reads a new isolated pawn: the Tarrasch, 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.dxc5 Bxc5', () => {
    const d = lineDiff(new Chess().fen(), ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'c7c5', 'c4d5', 'e6d5', 'd4c5', 'f8c5'], 'b', 10);
    expect(d?.facts).toContain('you get an isolated pawn (d5)');
  });

  it('never ends in the middle of a trade: 1…e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4 Nf6 5.Nxc6 (…bxc6 to come) stops at 4.Nxd4', () => {
    // The Evans sheet printed "material +3 for you" here: the line stopped on
    // Nxc6 with …bxc6 still to come.
    const d = lineDiff(after('e4'), ['e7e5', 'g1f3', 'b8c6', 'd2d4', 'e5d4', 'f3d4', 'g8f6', 'd4c6'], 'w', 8);
    expect(d?.sans.at(-1)).toBe('Nxd4');
    expect(d?.facts.some((f) => f.startsWith('material'))).toBe(false);
  });

  it('keeps a line that ends on the recapture: the trade is complete', () => {
    const d = lineDiff(after('e4'), ['e7e5', 'g1f3', 'b8c6', 'd2d4', 'e5d4', 'f3d4', 'c6d4', 'd1d4'], 'w', 8);
    expect(d?.sans.at(-1)).toBe('Qxd4');
    expect(d?.facts).toContain('off the board: yours a knight, a pawn; theirs a knight, a pawn');
  });

  it('stops at the first illegal move and says nothing for an empty line', () => {
    expect(lineDiff(new Chess().fen(), ['e7e5'], 'w')).toBeNull();
  });
});

describe('planItem', () => {
  it('reads a string or an object record', () => {
    expect(planItem('…c5 break')).toBe('…c5 break');
    expect(planItem({ move: '...c5', explanation: 'hits d4' })).toBe('...c5 — hits d4');
  });
});
