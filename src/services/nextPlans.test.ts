import { describe, it, expect } from 'vitest';

import { deriveNextPlans } from './nextPlans';
describe('findWorstPlacedPiece — undeveloped is not misplaced (walk 5, 2026-09-23)', () => {
  it('at move 10 the bishop still on c8 is not "your worst piece"', async () => {
    const { Chess } = await import('chess.js');
    const { findWorstPlacedPiece } = await import('./nextPlans');
    // The walk-5 Najdorf after 10.Qe2 — Black to move, c8 bishop unmoved.
    const c = new Chess('r1bq1rk1/1p1nbppp/p2ppn2/8/P2NP3/2N5/BPP1QPPP/R1B1K2R b KQ - 5 10');
    expect(findWorstPlacedPiece(c, 'b')?.sq).not.toBe('c8');
  });
});

describe('the weak-pawn plan reads the board it prescribes on (walk 5, R7)', () => {
  it('does not tell the student to plant a knight on a square their own pawn holds', () => {
    const plans = deriveNextPlans('6k1/pp4pp/2n1p3/4P3/8/8/PP4PP/6K1 b - - 0 20', 'b');
    const weak = plans.find((p) => /weak pawn on e5/.test(p));
    expect(weak).toBeDefined();
    expect(weak).not.toMatch(/plant your (knight|bishop)/);
    expect(weak).toMatch(/your pawn on e6 already stops it/);
  });

  it('states no plan while a whole student piece is en prise', () => {
    expect(deriveNextPlans('6k1/pp4pp/4pn2/4P3/8/8/PP4PP/6K1 b - - 0 20', 'b')).toEqual([]);
  });
});

describe('findWorstPlacedPiece — a back-rank rook is not misplaced (walk 6, R10)', () => {
  it('does not name the castled rook on f1 the worst piece', async () => {
    const { Chess } = await import('chess.js');
    const { findWorstPlacedPiece } = await import('./nextPlans');
    // Italian-style middlegame, move 11: White castled, f1 rook boxed by the king — closed centre.
    const fen = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP1N1PPP/R1BQ1RK1 w - - 0 11';
    const w = findWorstPlacedPiece(new Chess(fen), 'w');
    expect(w?.type === 'r' && w.sq[1] === '1').toBe(false);
  });
});

describe('no king attack without queens (review tape 2026-09-25)', () => {
  it('a king on f2 in a rook ending is not "stuck" — it is where it belongs', async () => {
    // The KID walk (student Black) after the queen trade and 22.Kf2.
    const { Chess } = await import('chess.js');
    const c = new Chess();
    for (const m of 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 c6 Kh1 Nh5 Be3 f5 Qd2 f4 Bf2 Be5 Nc2 Ng3+ Kg1 Qh4 Bd4 Nxf1 Bxf1 Be6 Bxe5 dxe5 Qd6 Nd7 Qc7 Qd8 Qxd8 Raxd8 Kf2'.split(' ')) c.move(m);
    const plans = deriveNextPlans(c.fen(), 'b', { studentPovCp: 200 });
    expect(plans.join(' ')).not.toMatch(/attack their king/);
  });
});
