// Danya's choices, on his own article boards (havecheck 2026-11-19): the moves
// he weighs for what they DO, and the tries refuted by what they do to the
// result. Reads are the saved engine lines (Stockfish 16 ply, White's view).
import { describe, it, expect } from 'vitest';
import { candidateMoves, weighedForWhatItDoes, temptingOnBoard, standingRefutations, resultShift, type WeighRead } from './weighedMoves';

const lines = (ls: Array<{ moves: string[]; cp: number }>): WeighRead[] => ls.map((l) => ({ evaluation: l.cp, mate: null, moves: l.moves }));

describe('the moves weighed for what they do (how-to-ruin-your-pawn-structure#1)', () => {
  // …h5 and the e6-bishop both hit the g4-pawn; f3 is its only guard.
  const fen = '1r2k2r/4bp2/p2pbp2/1p2p2p/4P1P1/P3BP2/1PPR3P/1K3B1R w k - 0 18';
  it('19.h3 — the natural defence of g4 — is a candidate though the eye passes over it', () => {
    expect(weighedForWhatItDoes(fen, 'h2h3')).toBe('defence');
    expect(candidateMoves(fen, 1800, { played: null, scored: null }).map((c) => c.san)).toContain('h3');
  });
  it('a move that neither threatens nor defends stays out (negative control)', () => {
    expect(weighedForWhatItDoes(fen, 'b1a1')).toBeNull();
    expect(candidateMoves(fen, 1800, { played: null, scored: null }).map((c) => c.san)).not.toContain('Ka1');
  });
  it('and its refutation is said: …hxg4 fxg4 Bxg4 wins the pawn', () => {
    const reads: WeighRead[] = [
      { evaluation: -28, mate: null, moves: ['g4h5', 'h8h5', 'h2h4', 'f6f5', 'e4f5', 'e6f5', 'f3f4', 'b8c8'] },
      { evaluation: -161, mate: null, moves: ['h2h3', 'h5g4', 'f3g4', 'e6g4', 'f1g2', 'g4e6', 'h3h4', 'e8d7'], earlier: ['h2h3', 'h5g4', 'f3g4', 'e6g4', 'f1g2', 'g4e6', 'h3h4', 'h8h5'] },
    ];
    const t = temptingOnBoard({ fen, student: 'w', rating: 1800, reads, priorMove: null });
    expect(t[0]?.san).toBe('h3');
    expect(t[0]?.text).toMatch(/hxg4/);
  });
});

describe('the try refuted by what it does to the result', () => {
  it('48…Ke7?? throws the win: Nd5+ (blunders-a-grandmasters-perspective#0)', () => {
    const fen = '4k3/7p/4PN2/p7/P6K/7P/1p4P1/8 b - - 0 48';
    const reads = lines([
      { moves: ['e8f8', 'e6e7', 'f8e7', 'f6d5', 'e7d6', 'd5c3', 'd6c5', 'c3b1', 'c5b4', 'h4h5'], cp: -329 },
      { moves: ['e8d8', 'e6e7', 'd8e7', 'f6d5', 'e7d6', 'd5c3', 'd6c5', 'h4h5', 'c5b4', 'c3b1'], cp: -325 },
      { moves: ['e8e7', 'f6d5', 'e7e6', 'd5c3', 'e6e5', 'h4g3', 'e5d4', 'c3b1', 'd4d3', 'b1a3'], cp: 0 },
    ]);
    const r = standingRefutations({ fen, student: 'b', rating: 1800, reads });
    expect(r.map((x) => x.san)).toEqual(['Ke7']);
    expect(r[0].reply).toBe('Nd5+');
    expect(r[0].text).toMatch(/throws the win/);
    // Kd8 keeps the win too: two moves of one result are no refutation.
    expect(r.some((x) => x.san === 'Kd8')).toBe(false);
  });

  it('31.Nxe7+ Rxe7 gives no relief: it wins nothing and leaves you worse (the-art-of-setting-traps#0)', () => {
    const fen = '1r2r3/2p1b3/p1k5/2PN1p1p/6pP/PPR1BnK1/5P2/7R w - - 0 31';
    const reads = lines([
      { moves: ['d5b4', 'c6b7', 'b4d5', 'b7c6', 'd5b4'], cp: 0 },
      { moves: ['c3d3', 'f3e5', 'd3d1', 'b8b3', 'd5b4', 'c6b5', 'b4d5', 'e7d8', 'd1b1', 'b3b1'], cp: -121 },
      { moves: ['d5e7', 'e8e7', 'h1d1', 'a6a5', 'c3d3', 'e7e4', 'e3f4', 'b8b7', 'f4h6', 'f3e5'], cp: -122 },
    ]);
    const nx = standingRefutations({ fen, student: 'w', rating: 1800, reads }).find((x) => x.san === 'Nxe7+');
    expect(nx?.reply).toBe('…Rxe7');
    expect(nx?.text).toMatch(/wins nothing/);
    expect(nx?.text).toMatch(/slightly worse/);
  });

  it('a try is named once and says one cost (sicilianClosed #31 shape: "Bxc3 wins nothing… Bxc3 gives back part of your edge")', () => {
    const fen = '1r2r3/2p1b3/p1k5/2PN1p1p/6pP/PPR1BnK1/5P2/7R w - - 0 31';
    const reads = lines([
      { moves: ['d5b4', 'c6b7', 'b4d5', 'b7c6', 'd5b4'], cp: 0 },
      { moves: ['c3d3', 'f3e5', 'd3d1', 'b8b3', 'd5b4', 'c6b5', 'b4d5', 'e7d8', 'd1b1', 'b3b1'], cp: -121 },
      { moves: ['d5e7', 'e8e7', 'h1d1', 'a6a5', 'c3d3', 'e7e4', 'e3f4', 'b8b7', 'f4h6', 'f3e5'], cp: -122 },
    ]);
    const text = standingRefutations({ fen, student: 'w', rating: 1800, reads }).find((x) => x.san === 'Nxe7+')?.text ?? '';
    expect(text).toBe('Nxe7+ is the obvious try, but …Rxe7 is the answer. It wins nothing: the trades leave the material level, and it leaves you slightly worse.');
    expect(text.split('Nxe7+').length - 1).toBe(1);
  });

  it('a try weighed for the plan is worded as the direct try failing', () => {
    const fen = '1r2r3/2p1b3/p1k5/2PN1p1p/6pP/PPR1BnK1/5P2/7R w - - 0 31';
    const reads = lines([
      { moves: ['d5b4', 'c6b7', 'b4d5', 'b7c6', 'd5b4'], cp: 0 },
      { moves: ['c3d3', 'f3e5', 'd3d1', 'b8b3', 'd5b4', 'c6b5', 'b4d5', 'e7d8', 'd1b1', 'b3b1'], cp: -121 },
      { moves: ['d5e7', 'e8e7', 'h1d1', 'a6a5', 'c3d3', 'e7e4', 'e3f4', 'b8b7', 'f4h6', 'f3e5'], cp: -122 },
    ]);
    const considered = new Map([['d5e7', { why: 'plan' as const, target: 'their bishop on e7', storm: false }]]);
    const nx = standingRefutations({ fen, student: 'w', rating: 1800, reads, considered }).find((x) => x.san === 'Nxe7+');
    expect(nx?.text).toMatch(/their bishop on e7/);
    expect(nx?.text).toMatch(/…Rxe7/);
  });

  it('a clear edge that stays an edge is the same result (negative control)', () => {
    expect(resultShift(250, 120, true, 'It')).toBeNull();
    expect(resultShift(250, 30, true, 'It')).toMatch(/edge is gone/);
    expect(resultShift(-150, -400, true, 'It')).toBeNull();
  });
});
