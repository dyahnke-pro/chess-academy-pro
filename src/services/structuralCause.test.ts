// The structural causes (MISTAKE-CAUSES.md §B), each proven on a board where
// it fires and a guard where it must not. Boards from David's games carry the
// saved engine read they were graded with (audit-reports/teaching-census-data);
// the constructed ending boards are named as such, each checked with Stockfish
// (depth 22) when written.
import { describe, it, expect } from 'vitest';
import {
  colourConceded, compensationLost, passerHanded, stalemateCause, techniqueBroken, tempoWasted, tradedIntoTarget,
  type StructuralArgs,
} from './structuralCause';
import { errorWhy, NO_SECOND_READ } from './inaccuracyCall';

const args = (a: Partial<StructuralArgs> & Pick<StructuralArgs, 'fenBefore' | 'playedSan'>): StructuralArgs => ({
  replyLineUci: [], bestLineUci: null, bestSan: null, costCp: 100, priorMove: null, ...a,
});

// THE APPROVED REFERENCE (David 2026-11-24): chesscom-1001055178 ply 17,
// 9.Bxf6 Bxf6 — the dark-squared bishop is gone, d4 has no guard and their
// bishop on f6 already hits it. Saved read: best Bc1 (+20), played −52.
const BXF6 = 'r2qk2r/ppp1bpp1/2n1pn1p/3p2B1/3P4/1P3PP1/P1P2PBP/RN1Q1RK1 w kq - 0 9';
const BXF6_REPLY = ['e7f6', 'c2c3', 'c6e7', 'd1d3', 'e8g8', 'b1d2'];
const BXF6_BEST = ['g5c1', 'f6d7', 'c1b2', 'e7f6', 'f3f4', 'e8g8'];

describe('colour-conceded', () => {
  it('9.Bxf6 gives up the dark squares, d4 first', () => {
    const r = colourConceded(BXF6, 'Bxf6', BXF6_REPLY, BXF6_BEST);
    expect(r).toMatchObject({ kind: 'colour-conceded', colour: 'dark', target: 'd4', enemyBishop: 'f6', pawnTargets: ['d4'] });
  });
  it('with no line known, the recapture on offer is the trade', () => {
    expect(colourConceded(BXF6, 'Bxf6')).toMatchObject({ colour: 'dark', target: 'd4' });
  });
  it('errorWhy hands it over as the cause, at its 72 cp', () => {
    const ew = errorWhy({
      secondReads: NO_SECOND_READ, costCp: 72, fenBefore: BXF6, playedSan: 'Bxf6', moverColor: 'white', bestSan: 'Bc1',
      bestLineUci: BXF6_BEST, replyLineUci: BXF6_REPLY, replySan: 'Bxf6',
      missedMate: null, allowedMate: null, bestMate: null, quality: 'inaccuracy', priorMove: null, namesBetterMove: false,
    });
    expect(ew.cause.kind).toBe('colour-conceded');
    expect(ew.cause.detail).toMatchObject({ kind: 'colour-conceded', target: 'd4', enemyBishop: 'f6' });
  });
  it('guard: the better move keeps the bishop', () => {
    expect(colourConceded(BXF6, 'Bc1', ['f6d7', 'c1b2'], null)).toBeNull();
  });
  // chesscom-1013773584 ply 63, 32.Bxd7 Kxd7: they have no bishop left to
  // use the light squares (card CC7, "trading this bishop was safe").
  it('guard: they have no bishop of that colour', () => {
    expect(colourConceded('8/1pkn4/8/p2p1B2/6RP/4r1p1/PPP5/1K3R2 w - - 5 32', 'Bxd7', ['c7d7'], null)).toBeNull();
  });
});

// chesscom-1018307238 ply 46, 23…Re5 Rxe5 dxe5: the trade leaves an isolated
// pawn on e5 their rook can reach. Saved read: best Bh3 (−17).
const RE5 = '1r2rk2/p6p/2pp4/5bp1/2P5/1P4P1/P5NP/2R1R1K1 b - - 1 23';
describe('traded-into-target', () => {
  it('…Re5 Rxe5 dxe5 leaves e5 isolated', () => {
    const r = tradedIntoTarget(args({
      fenBefore: RE5, playedSan: 'Re5', bestSan: 'Bh3',
      replyLineUci: ['e1e5', 'd6e5', 'c1f1', 'f8e7'], bestLineUci: ['f5h3', 'c1d1', 'e8e1', 'd1e1'],
    }));
    expect(r).toEqual({ kind: 'traded-into-target', pawn: 'e5', weakness: 'isolated' });
  });
  it('guard: the better move trades nothing', () => {
    expect(tradedIntoTarget(args({ fenBefore: RE5, playedSan: 'Bh3', replyLineUci: ['c1d1', 'e8e1'] }))).toBeNull();
  });
  // chesscom-1020779996 ply 57, 29.bxa6 (197 cp): errorWhy files it here.
  it('errorWhy hands it over on 29.bxa6', () => {
    const ew = errorWhy({
      secondReads: NO_SECOND_READ, costCp: 197, fenBefore: '2k3rr/1Npb3p/p3p1q1/PP2Pn2/3n4/2pP3Q/6BP/R1B2RK1 w - - 1 29', playedSan: 'bxa6',
      moverColor: 'white', bestSan: 'Ra2', bestLineUci: ['a1a2', 'c3c2', 'f1f2', 'd7b5', 'b7c5', 'f5h4'],
      replyLineUci: ['d7c6', 'f1f2', 'f5h4', 'h3g3', 'c6g2', 'f2g2'], replySan: 'Bc6',
      missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null, namesBetterMove: false,
    });
    expect(ew.cause.kind).toBe('traded-into-target');
  });
});

describe('passer-handed', () => {
  // chesscom-1013773584 ply 79, 40.Rg7+ Kc6 cxb4 axb4: the c-pawn is traded
  // off and their d-pawn runs free.
  it('40.Rg7+ lets the d-pawn out', () => {
    const r = passerHanded(args({
      fenBefore: '8/1k6/6RP/p2p4/1p5r/2P5/PP6/1K4R1 w - - 0 40', playedSan: 'Rg7+', bestSan: 'Rf6',
      replyLineUci: ['b7c6', 'c3b4', 'a5b4', 'g7g4'], bestLineUci: ['g6f6', 'h4c4', 'g1g7', 'c4c7'],
    }));
    expect(r).toMatchObject({ kind: 'passer-handed', pawn: 'd5', how: 'created', toQueen: 4 });
  });
  // chesscom-1042725180 ply 72, 36…Nf8: the knight leaves d7, the blockade of
  // the d6 pawn is lifted.
  it('…Nf8 lifts the blockade on d6', () => {
    const r = passerHanded(args({ fenBefore: '7k/3n1Qbp/p2P4/1p4p1/8/P6P/6P1/4q1BK b - - 1 36', playedSan: 'Nf8', replyLineUci: ['a3a4'] }));
    expect(r).toMatchObject({ kind: 'passer-handed', pawn: 'd6', how: 'blockade-lifted', toQueen: 2 });
  });
  // chesscom-1020779996 ply 43, 22.b4 dxc3: the c3 pawn is passed, but the
  // knight on e4 simply takes it — nothing handed.
  it('guard: a new passer the mover can win is not handed', () => {
    expect(passerHanded(args({
      fenBefore: '2kr3r/1ppbq2p/p1n1p1p1/P3Pn2/3pNP2/2PP3Q/1P4BP/R1B2RK1 w - - 4 22', playedSan: 'b4', bestSan: 'Bd2',
      replyLineUci: ['d4c3', 'c1e3', 'e7h4'], bestLineUci: ['c1d2', 'g6g5', 'e4f6'],
    }))).toBeNull();
  });
});

// chesscom-1002984876 ply 51, 26.Rh6: a pawn down with their king in the
// middle, the better move Nxb5 takes back; the quiet rook move lets …Kf7
// tuck the king away.
const RH6 = 'r3k3/p1Bn4/2R5/1pb3p1/7p/2N2P1n/PPP4P/2K5 w - - 3 26';
describe('compensation-lost', () => {
  it('26.Rh6 lets the king walk out', () => {
    const r = compensationLost(args({
      fenBefore: RH6, playedSan: 'Rh6', bestSan: 'Nxb5',
      replyLineUci: ['e8f7', 'c7d6', 'c5d6', 'h6d6'], bestLineUci: ['c3b5', 'e8f7', 'c2c3', 'h3g1'],
    }));
    expect(r).toMatchObject({ kind: 'compensation-lost', down: 1, consolidate: 'Kf7' });
  });
  it('guard: the forcing move itself keeps it', () => {
    expect(compensationLost(args({ fenBefore: RH6, playedSan: 'Nxb5', bestSan: 'Nxb5', replyLineUci: ['e8f7'], bestLineUci: ['c3b5'] }))).toBeNull();
  });
});

// Constructed (the stalemateWatch fixture): Qg7# mates, Qg6 stalemates.
describe('stalemate', () => {
  const FEN = '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1';
  it('Qg6 leaves the king no move', () => {
    expect(stalemateCause(args({ fenBefore: FEN, playedSan: 'Qg6' }))).toEqual({ kind: 'stalemate', king: 'h8', plies: 0 });
  });
  it('guard: the mate is not a stalemate', () => {
    expect(stalemateCause(args({ fenBefore: FEN, playedSan: 'Qg7#' }))).toBeNull();
  });
  it('errorWhy tells it before the mate it missed', () => {
    const ew = errorWhy({
      secondReads: NO_SECOND_READ, costCp: null, fenBefore: FEN, playedSan: 'Qg6', moverColor: 'white', bestSan: 'Qg7#',
      bestLineUci: ['g1g7'], replyLineUci: [], missedMate: 1, allowedMate: null, bestMate: 1,
      quality: 'blunder', priorMove: null, namesBetterMove: false,
    });
    expect(ew.cause.kind).toBe('stalemate');
  });
});

// Constructed endings, each checked with Stockfish (depth 22).
describe('technique-broken', () => {
  // Ke4 stands on a key square of the e2 pawn and wins (+35); Kd2 lets …Kd6
  // hold it (−0.1).
  it('the king leaves the key square', () => {
    expect(techniqueBroken(args({ fenBefore: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', playedSan: 'Kd2', bestSan: 'Ke4', bestLineUci: ['e3e4'] })))
      .toMatchObject({ kind: 'technique-broken', rule: 'key-square', square: 'e4' });
  });
  // …Ke6 takes the opposition and draws; …Kd7 lets Ke5 in (+35).
  it('the opposition given up', () => {
    expect(techniqueBroken(args({ fenBefore: '8/4k3/8/8/4K3/4P3/8/8 b - - 0 1', playedSan: 'Kd7', bestSan: 'Ke6', bestLineUci: ['e7e6'] })))
      .toMatchObject({ kind: 'technique-broken', rule: 'opposition', square: 'e6' });
  });
  // Ra1 stands behind the a5 passer; a6 (+3.6) keeps it there, Rc1 (+2.3)
  // walks off the file.
  it('the rook leaves its place behind the passer', () => {
    expect(techniqueBroken(args({ fenBefore: 'r5k1/5ppp/8/P7/8/8/5PPP/R5K1 w - - 0 40', playedSan: 'Rc1', bestSan: 'a6', bestLineUci: ['a5a6'] })))
      .toMatchObject({ kind: 'technique-broken', rule: 'rook-behind-passer', square: 'a1' });
  });
  it('guard: the rook moving up behind its pawn keeps the rule', () => {
    expect(techniqueBroken(args({ fenBefore: 'r5k1/5ppp/8/P7/8/8/5PPP/R5K1 w - - 0 40', playedSan: 'Ra4', bestSan: 'a6', bestLineUci: ['a5a6'] }))).toBeNull();
  });
  it('guard: the key square kept', () => {
    expect(techniqueBroken(args({ fenBefore: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', playedSan: 'Kf4', bestSan: 'Ke4', bestLineUci: ['e3e4'] }))).toBeNull();
  });
});

describe('tempo-wasted', () => {
  // chesscom-1020779996 ply 10 (card emptyCheckAt §G): 5…Qh4+ is met by g3
  // and the queen has to go back (82 cp).
  it('5…Qh4+ g3 is a check that goes nowhere', () => {
    expect(tempoWasted(args({
      fenBefore: 'rnbqkb1r/pppn1ppp/4p3/3pP3/5P2/3P4/PPPN2PP/R1BQKBNR b KQkq - 0 5', playedSan: 'Qh4+', costCp: 82, replyLineUci: ['g2g3', 'h4d8'],
    }))).toEqual({ kind: 'tempo-wasted', how: 'empty-check', squares: ['h4', 'g3'] });
  });
  // David's Smith-Morra 8.Bxf7+ Kxf7: a check that captures is not empty.
  it('guard: a check that captures', () => {
    expect(tempoWasted(args({
      fenBefore: 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8', playedSan: 'Bxf7+', replyLineUci: ['e8f7'],
    }))).toBeNull();
  });
});
