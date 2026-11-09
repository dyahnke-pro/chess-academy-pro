// THE OUTPOST LEVER NAMES ONLY HOLES A PIECE CAN TAKE (G4.5, WO-ONE-COACH-01
// Build 4). It said "plant a knight on" the four most central holes — squares
// in your own half, squares no knight could reach — because the hole list was
// cut to four instead of read through a bar.
import { describe, it, expect } from 'vitest';
import { boardPlanFacts } from './boardPlanFacts';

const outpost = (fen: string): string | undefined =>
  boardPlanFacts(fen, 'white')?.levers.find((l) => l.kind === 'outpost')?.phrase;

describe('the outpost lever', () => {
  it('a knight: only the hole in their camp the knight gets to', () => {
    // c4, the only stop to e5, is hit by the c8 rook; d6 is reached via b5.
    expect(outpost('2r2rk1/pp4pp/8/8/8/N7/PP4PP/3RR1K1 w - - 0 20')).toBe('plant a knight on d6');
  });
  it('a bishop: the holes of its colour it reaches, said as a bishop', () => {
    expect(outpost('2r2rk1/pp4pp/8/8/8/1B6/PP4PP/3RR1K1 w - - 0 20')).toBe('post a bishop on d5 or e6');
  });
  it('no minor: no lever', () => {
    expect(outpost('2r2rk1/pp4pp/8/8/8/8/PP4PP/3RR1K1 w - - 0 20')).toBeUndefined();
  });
});

describe('the worst-piece lever — no road, no plan (WO-DEPTH-01, 2026-11-08)', () => {
  const worst = (fen: string, side: 'white' | 'black'): string | undefined =>
    boardPlanFacts(fen, side)?.levers.find((l) => l.kind === 'worst')?.phrase;
  it('a knight with no safe road gets no lever ("find a better square" named no square)', () => {
    // The Colle board: the h5 knight is stuck on the rim and every road is hit.
    expect(worst('r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p2Q1/2PB4/PP3PPP/R1B1R1K1 w - - 0 16', 'white')).toBeUndefined();
  });
  it('a piece with a road: the lever names where it goes and why', () => {
    // David's game chesscom-1002984876 after 21.Nc3: the h3 knight wants f4
    // (two knights, so this one is named by its square).
    expect(worst('r1k5/p1pn3p/8/1pb3p1/8/2N2PBn/PPP4P/2K2R2 b - - 3 21', 'black')).toBe('bring your knight on h3 to f4, an outpost no pawn can chase it from, and the g-pawn backs it up');
  });
});

describe('a rook\'s road is the file lever\'s idea', () => {
  it('never "put a rook on the b, d or e file" and then "bring your rook on a1 to b1, on the b-file"', () => {
    // The colle800 replay game after 21.bxc3 (the decision baseline's ply 42,
    // 2026-11-09): the a1 rook's road ends on b1, the b-file.
    const fen = 'r1b1r1k1/5ppp/pq2p3/1p1p2B1/5Q2/2P5/P4PPP/R3R1K1 b - - 0 21';
    const levers = boardPlanFacts(fen, 'white')?.levers ?? [];
    expect(levers.some((l) => l.kind === 'file')).toBe(true);
    expect(levers.filter((l) => l.kind === 'worst')).toEqual([]);
  });
});
