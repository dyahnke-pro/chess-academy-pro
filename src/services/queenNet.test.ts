import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { queenNet, queenNetLine, queenSafeSquares } from './queenNet';
import { readBoard } from './boardComputers';

// Danya speedrun hv0P9kotpJw, 12.Nd4 (his White): "to trap the queen, list its
// escapes: everything is covered except …Qe6, so Nd4 covers e6".
const RAID = 'r1b1k2r/pppp1ppp/7n/4P3/1B2P3/5N2/q1P2PPP/1R1QKB1R w Kkq - 1 12';
// LJa5Df75CJI, 9…Bg4 (his Black): "…Bg4 on the boxed-in queen forces f3".
const BOXED = 'rnbq1rk1/pp3pp1/2pb1n1p/4p3/4p3/1BN4N/PPPP1PPP/R1BQKR2 b Q - 1 9';
const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

describe('queenNet: list the queen\'s escapes', () => {
  it('Nd4 covers e6, and the raiding queen on a2 has only a4 left', () => {
    expect(queenSafeSquares(RAID, 'a2')).toEqual(expect.arrayContaining(['a4', 'e6']));
    const n = queenNet(RAID, 'Nd4');
    expect(n).toMatchObject({ queen: 'a2', taken: ['e6'], left: ['a4'], hits: false });
    const line = queenNetLine(n!, true, after(RAID, 'Nd4'));
    expect(line).toMatch(/Their queen on a2 is running short of squares: your knight on d4 covers e6\. Its only safe square left is a4\./);
  });
  it('a quiet move that takes none of its squares says nothing', () => {
    expect(queenNet(RAID, 'Bd3')).toBeNull();
    expect(queenNet(RAID, 'h3')).toBeNull();
  });
  it('comes out of the one registry', () => {
    const f = readBoard('queenNet', { fenBefore: RAID, san: 'Nd4', student: 'w' });
    expect(f?.computer).toBe('queenNet');
    expect(f?.seat).toBe('student');
  });
});

describe('queenNet: a hit on a queen with nowhere to go', () => {
  it('Bg4 hits the queen on d1 and covers e2: no safe square', () => {
    expect(queenSafeSquares(BOXED, 'd1')).toEqual(['e2']);
    const n = queenNet(BOXED, 'Bg4');
    expect(n).toMatchObject({ queen: 'd1', taken: ['e2'], left: [], hits: true });
    expect(queenNetLine(n!, true, after(BOXED, 'Bg4'))).toMatch(/Your bishop on g4 hits their queen on d1 and covers e2\. It has no safe square left\./);
  });
  it('a queen at home with few squares is no net unless the move hits it', () => {
    // …Nd7 takes no square of the queen's and hits nothing.
    expect(queenNet(BOXED, 'Nbd7')).toBeNull();
  });
});
