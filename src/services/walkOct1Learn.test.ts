// Learn hand walk 2026-10-01, game rgLTiUZAWQY (Scandinavian, student White).
// Each case is a real position from the tape; each FAILS on the code it was
// found against.
import { describe, it, expect } from 'vitest';
import { extractMentionedSans } from './arrowEngine';
import { lineWins } from './lineCalc';
import { gameArcs } from './lookaheadPlan';
import { namedMoveArrows } from './learnBoardTeaching';
import { stopReason } from './moveIntent';
import { computeMoveFundamentals } from './moveFundamentals';
import { routeDestination, planFromUci } from './lookaheadPlan';
import { gradePlayedMove } from './playedMoveGrade';
import { quietMovePoint } from './reviewMoveTeaching';
import { findRookLift } from './positionReadingService';
import { attributePrinciples } from './principleAttribution';

describe('Learn walk 2026-10-01 — game 1 flags', () => {
  it('a square a piece is kicked OFF is not a move (no c7-c6 arrow)', () => {
    expect(extractMentionedSans('d5 kicks their knight off c6, gaining time.')).not.toContain('c6');
  });

  it('a move the line says is STOPPED is never arrowed as one to play', () => {
    const fen = '3rk2r/ppp2pp1/4b1np/7R/1bP5/2N2N2/PP2BPP1/R1B1K3 w Qk - 2 15';
    const arrows = namedMoveArrows('Their …Bb4 does two jobs: it stops your Ra5, and it prepares …O-O, to castle.', fen, 'w');
    expect(arrows.some((a) => a.from === 'h5' && a.to === 'a5')).toBe(false);
    const fen2 = '7r/p5p1/1p2k1p1/2pR4/P1P5/2P1B2p/3K1PP1/8 w - - 0 27';
    const a2 = namedMoveArrows('Bf4 didn\'t work: Bf4, h2, Rd6+, Kf5, Bxh2 and Rxh2.', fen2, 'w');
    expect(a2.some((a) => a.from === 'e3' && a.to === 'f4')).toBe(false);
  });

  it('a king move a pawn now covers says WHY it no longer works', () => {
    const why = stopReason('8/2k3p1/P5R1/2p4r/2P3p1/2PKB3/5P2/8 b - - 0 35', 'c7b7', 'w');
    expect(why).toMatch(/a6/);
    expect(why).toMatch(/b7/);
  });

  it('an ending does not credit a rook with "taking aim at the center"', () => {
    const f = computeMoveFundamentals('7r/p5p1/1p2k1p1/2pR3p/2P5/2P1B3/P4PP1/2K5 w - - 0 25', 'Rg5', 'white');
    expect(f.some((x) => x.id === 'center')).toBe(false);
  });

  it('a route onto a square its own piece holds is no plan; onto theirs, it takes', () => {
    // "getting the rook to c3, by way of c1" — White's own knight stands on c3.
    expect(routeDestination('3rk2r/p1p2pp1/1p2b1np/7R/1bP5/2N1BN2/PP2BPP1/R3K3 w Qk - 0 16', 'c3', 'white')).toEqual({ kind: 'own' });
    // "getting the knight to a7" — a7 holds their pawn.
    expect(routeDestination('3rk2r/p1pb1pp1/1p4np/7R/1bPN4/2N1B3/PP2BPP1/2KR4 b k - 1 17', 'a7', 'white')).toEqual({ kind: 'takes', piece: 'pawn' });
    expect(routeDestination('3rk2r/p1pb1pp1/1p4np/7R/1bPN4/2N1B3/PP2BPP1/2KR4 b k - 1 17', 'b5', 'white')).toEqual({ kind: 'empty' });
  });
});

describe('Learn walk 2026-10-01 — games 2 and 3', () => {
  it('a passer the line takes straight back is never "created" (exf3, then Qxf3)', () => {
    const p = planFromUci('r2q1rk1/ppn3pp/2nb4/2p2p2/2P1p3/P1N2PP1/1PP3BP/R1BQR1K1 b - - 0 17', ['e4f3', 'd1f3', 'g8h8', 'c1f4', 'c6d4'], 'black');
    expect(p?.mine.text ?? '').not.toMatch(/passed pawn on f3/);
  });

  it('a move is not "the only one that holds" when the runner-up still wins', () => {
    const g = gradePlayedMove({
      fenBefore: '6k1/4pp2/3p3p/3P2pP/4P1P1/r4PK1/r1b3B1/8 b - - 3 39', playedUci: 'c2e4',
      fenAfter: '6k1/4pp2/3p3p/3P2pP/4b1P1/r4PK1/r5B1/8 w - - 0 40',
      analysisBefore: { bestMove: 'c2e4', topLines: [
        { rank: 1, evaluation: 0, mate: -5, moves: ['c2e4', 'g3h2'] },
        { rank: 2, evaluation: -900, mate: null, moves: ['c2d3', 'e4e5'] },
      ] } as never, studentColor: 'b' });
    expect(g?.reason).not.toBe('only-move');
  });

  it('…h6 against a bishop on g5 is named for the kick, not for luft', () => {
    expect(quietMovePoint('r1bq1rk1/pppnppbp/3p1np1/6B1/2PP4/5NP1/PP2PPBP/RN1Q1RK1 b - - 5 7', 'h6')).toMatch(/bishop off g5/);
  });

  it('no rook lift where the third rank is blocked short of the king', () => {
    expect(findRookLift('r2q1rk1/ppn3pp/2nbb3/2p1pp2/8/P1NP2P1/1PPN1PBP/R1BQR1K1 w - - 5 15', 'w')).toBeNull();
  });

  it('a recapture inside a plain trade is not the "trap" a calculation missed', () => {
    const hist = ['e4', 'c5', 'Nf3', 'Nf6', 'e5', 'Nd5', 'Nc3', 'e6', 'Ne4', 'f5', 'Nc3', 'Nb4', 'g3', 'd5', 'exd6', 'Bxd6', 'Bg2', 'O-O', 'O-O', 'e5', 'd3', 'N8c6', 'a3', 'Na6', 'Re1', 'Nc7', 'Nd2', 'Be6', 'Nc4', 'Bxc4', 'dxc4', 'e4', 'f3', 'Kh8', 'fxe4', 'f4', 'gxf4', 'Bxf4', 'Qxd8', 'Raxd8', 'Bxf4', 'Rxf4', 'Nd5', 'Rf7', 'Rf1', 'Rxf1+', 'Rxf1', 'Ne6', 'c3'];
    const out = attributePrinciples({ historySans: hist, bestSan: 'e5', classification: 'inaccuracy', pvAfterPlayed: ['Rf8', 'Rxf8+', 'Nxf8', 'h4', 'Kg8'], evalBefore: 139, evalAfterPlayed: 46 } as never);
    expect(out.map((a) => a.id)).not.toContain('calculation-depth');
  });
});

describe('Learn re-walk 2026-10-01', () => {
  it('a square in a list after "and" is not a move ("hitting d4 and e5")', () => {
    expect(extractMentionedSans('Bg7 takes aim at the center, hitting d4 and e5.')).not.toContain('e5');
    expect(extractMentionedSans('It eyes d4, e5 and c5.')).toEqual([]);
  });

  it('a winning line names what changes hands, not "two pawns" for a piece', () => {
    // exd5 takes a knight, …cxd5 takes the pawn back: a knight for a pawn.
    const w = lineWins('4k3/8/2p5/3n4/4P3/8/8/4K3 w - - 0 1', ['e4d5', 'c6d5', 'e1e2'], 'w');
    expect(w?.what).toBe('a knight for a pawn');
  });
});

describe('Review walk 2026-10-01', () => {
  it('a passer is not announced before it exists (a4 with …a6 still blocking it)', () => {
    const sans = ["e4", "d5", "exd5", "Nf6", "Bb5+", "Bd7", "Be2", "Nxd5", "d4", "Nc6", "c4", "Nf6", "d5", "Ne5", "Nf3", "Ng6", "h4", "h6", "h5", "Nxh5", "Rxh5", "e6", "dxe6", "Bxe6", "Qxd8+", "Rxd8", "Nc3", "Bb4", "Be3", "b6", "Nd4", "Bd7", "O-O-O", "Bxc3", "bxc3", "c5", "Nf5", "Bxf5", "Rxd8+", "Kxd8", "Rxf5", "Ke7", "Bh5", "Ke6", "Bxg6", "fxg6", "Rd5", "h5", "Kd2", "h4", "a4", "h3", "gxh3", "Rxh3", "Rd8", "a6", "Rb8", "Rh4", "Rxb6+", "Kd7", "Kd3", "g5", "Rxa6", "g4", "Rg6", "Rh5", "a5", "Kc7", "a6", "Kb8", "Rxg7", "Rh8", "Bxc5", "Ka8", "Bb6", "Rf8", "c5", "Rf3+", "Kc4", "Rf4+", "Kb5", "Rf8", "Rd7", "Kb8", "Rd8+", "Rxd8", "Bxd8", "Ka8", "c6", "Kb8", "Bb6", "Kc8", "a7", "g3", "a8=N"];
    const arcs = gameArcs(sans, 'white');
    // Index 56 is 29.Rb8 (ply 57): …a6 still stands in front of the a4 pawn.
    for (let i = 0; i <= 58; i += 1) {
      for (const e of arcs.get(i) ?? []) {
        expect(JSON.stringify(e)).not.toMatch(/passed pawn on the a-file/);
      }
    }
  }, 30_000);
});
