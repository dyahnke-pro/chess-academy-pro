// The missing cause readers (docs/plans/2026-11-23-learn-mistakes-only.md,
// "Missing items"), each on a board from David's saved games (fire) and a
// guard board. Lines are the saved engine reads (UCI, White's side).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { minorRetreat, missedTempo, pawnLetGo, rookActivityLost } from './causeReaders';
import { bishopShutBy } from './theirMoveCost';
import { hangingPawns } from './nextPlans';

describe('minorRetreat — a minor piece walks back to its back rank, unforced', () => {
  it('fires: g chesscom-1001055178 ply 29 Ne1 (cost 90)', () => {
    expect(minorRetreat('r4rk1/1p1qnpp1/p1p1pb1p/3p4/2PP1P2/1P4P1/P1N2PBP/R2Q1RK1 w - - 0 15', 'Ne1')).toEqual({ piece: 'n', from: 'c2', to: 'e1' });
  });
  it('guard: g chesscom-1015773958 ply 17 Bc1 guards the loose b2 pawn — not a wasted tempo', () => {
    expect(minorRetreat('r1b1k2r/pp3pbp/1qnppnp1/2p5/4P3/3PB1P1/PPP1QP1P/R3KBNR w KQkq - 1 9', 'Bc1')).toBeNull();
  });
});

describe('bishopShutBy — a pawn move that shuts in its own bishop', () => {
  it('fires: g chesscom-1036689856 ply 17 d3 (cost 195) shuts in the f1 bishop', () => {
    expect(bishopShutBy('rnbq1rk1/p1p2ppp/1p6/1Qb1p3/4Pn2/5N2/PPPP1PPP/R1B1KB1R w KQ - 0 9', 'd3')).toMatchObject({ bishop: 'f1', pawn: 'd3' });
  });
  it('guard: g chesscom-1042725180 ply 38 …f6 leaves the g7 bishop squares', () => {
    expect(bishopShutBy('r1q1r1k1/1b3pbp/ppn1p1p1/2ppP3/2P2P2/P2PBB1P/1P2N1P1/1R1Q1R1K b - - 0 19', 'f6')).toBeNull();
  });
});

describe('missedTempo — a quiet move where the better one came with tempo', () => {
  const FEN = 'r1bqr1k1/p4pbp/1p4p1/2p5/3pPP2/B2P3P/PP1NQ1P1/R3K2R b KQ - 1 16';
  it('fires: g chesscom-1012441262 ply 26 …Kg8 (cost 103), where …Rg8 added an attacker to the knight on g7', () => {
    expect(missedTempo('r4r2/pppqpkNp/2np1npB/7b/3PP3/2P3QP/PP3PP1/RN2K2R b KQ - 2 13', 'Kg8', 'Rg8')).toMatchObject({ bestSan: 'Rg8', how: 'threat', target: 'g7' });
  });
  it('fires: g chesscom-1005776142 ply 32 …b5 (cost 133), where …Qh4+ checked', () => {
    expect(missedTempo(FEN, 'b5', 'Qh4+')).toEqual({ bestSan: 'Qh4+', how: 'check', target: null });
  });
  it('guard: the better move is quiet too (…f5 against …Bb7) — and the check itself is not a miss', () => {
    expect(missedTempo(FEN, 'f5', 'Bb7')).toBeNull();
    expect(missedTempo(FEN, 'Qh4+', 'Qh4+')).toBeNull();
  });
});

describe('pawnLetGo — the reply line wins a centre pawn the better line keeps', () => {
  it('fires: g chesscom-1018863294 ply 21 Qd4 (cost 219) lets d5 go', () => {
    expect(pawnLetGo('r3kb1r/pp1bpppp/5nn1/q2P4/5B2/2N1Q3/PP3PPP/R3KBNR w KQkq - 3 11', 'Qd4',
      ['g6f4', 'd4f4', 'f6d5', 'f4e5', 'e7e6', 'f1c4'], ['a1d1', 'g6f4', 'e3f4', 'g7g6', 'g1f3', 'a5b6'])).toEqual({ pawn: 'd5', plies: 3 });
  });
  it('fires: g chesscom-1020779996 ply 43 b4 (cost 187) lets c3 go', () => {
    expect(pawnLetGo('2kr3r/1ppbq2p/p1n1p1p1/P3Pn2/3pNP2/2PP3Q/1P4BP/R1B2RK1 w - - 4 22', 'b4',
      ['d4c3', 'c1e3', 'e7h4', 'h3h4', 'f5h4'], ['c1d2', 'g6g5', 'e4f6', 'h7h6', 'g2e4', 'c8b8'])?.pawn).toBe('c3');
  });
  it('guard: g chesscom-1042725180 ply 38 …f6 — the c5 pawn taken is taken back (a trade)', () => {
    expect(pawnLetGo('r1q1r1k1/1b3pbp/ppn1p1p1/2ppP3/2P2P2/P2PBB1P/1P2N1P1/1R1Q1R1K b - - 0 19', 'f6',
      ['b2b4', 'c6e7', 'b4c5', 'b6c5', 'e5f6'], ['c6e7', 'b2b4', 'e7f5', 'e3f2', 'c5b4'])).toBeNull();
  });
  it('guard: g chesscom-1042725180 ply 37 e5 — the pawn the line takes is on the b-file', () => {
    expect(pawnLetGo('r1q1r1k1/1b3pbp/ppn1p1p1/2pp4/2P1PP2/P2PBB1P/1P2N1P1/1R1Q1R1K w - - 0 19', 'e5',
      ['c6e7', 'e2g3', 'a6a5', 'b2b4', 'c5b4'], ['c4d5', 'e6d5', 'e4e5', 'd5d4', 'e3f2'])).toBeNull();
  });
});

describe('rookActivityLost — a rook leaves an open file the better move keeps', () => {
  const FEN = '1rr3k1/1p2q1p1/p1p1p2p/2b2p2/5P2/5BP1/P1Q2P1P/3R1R1K w - - 2 25';
  it('fires: g chesscom-1001055178 ply 49 Rb1 (cost 107) leaves the open d-file', () => {
    expect(rookActivityLost(FEN, 'Rb1', 'Rd2')).toEqual({ from: 'd1', to: 'b1', file: 'd', was: 'open' });
  });
  it('guard: Rd2 stays on the file; Re1 when the better move also leaves the d-file', () => {
    expect(rookActivityLost(FEN, 'Rd2', 'Re1')).toBeNull();
    expect(rookActivityLost(FEN, 'Rb1', 'Re1')).toBeNull();
  });
});

describe('hangingPawns — the one definition, both seats', () => {
  it('fires: the QGD Tartakower after …bxc5 (watch lesson line) — Black has them', () => {
    const c = new Chess();
    for (const m of 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5 Qa3 Rc8 Bb5 a6 dxc5 bxc5'.split(' ')) c.move(m);
    expect(hangingPawns(c.fen())).toEqual(['b']);
  });
  it('guard: the same pair with an e-pawn beside it is a chain, not hanging', () => {
    expect(hangingPawns('2r2rk1/4qpp1/p3p2p/2pp4/8/Q3PN2/PP3PPP/3RK2R w K - 0 17')).toEqual([]);
  });
});
