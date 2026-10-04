import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { planFromUci } from './lookaheadPlan';

// Clean-pass walk 2026-10-03, G2 ply 30 (lichess VRUh4Qgh): "getting the
// bishop to e2, by way of a6, to take the knight there" — on the board it was
// said over, e2 held White's QUEEN; a knight only reached e2 later in the line.
const FEN = 'r1bq1rk1/pp4pp/4p3/5p2/1n1P3P/2N1PNb1/PP2Q1P1/RB3RK1 b - - 3 16';
const LINE = ['b7b6', 'h4h5', 'c8a6', 'e2f2', 'a8c8', 'c3e2', 'a6e2'];

describe('a route names a capture only of the piece standing there now', () => {
  it('the line replays', () => {
    const c = new Chess(FEN);
    for (const u of LINE) expect(c.move({ from: u.slice(0, 2), to: u.slice(2, 4) })).toBeTruthy();
  });
  it('no "take the knight there" over a square that holds their queen', () => {
    const plan = planFromUci(FEN, LINE, 'black', null);
    expect(JSON.stringify(plan)).not.toMatch(/take the knight there/);
  });
});

// Review walk 2026-10-04, G2 16.Bb1: "walk the bishop round to d5, by way of c4
// and take the knight there" — d5 was EMPTY; their knight reached it later.
describe('a capture of a piece that is not there yet is said as one that lands', () => {
  it('Nf3 … e5 Nxe5: "the pawn that lands there"', () => {
    const F = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const plan = planFromUci(F, ['g1f3', 'e7e5', 'f3e5', 'a7a6'], 'white', null);
    const said = JSON.stringify(plan);
    expect(said).not.toMatch(/take the pawn there/);
    expect(said).toMatch(/pawn that lands/);
  });
});
