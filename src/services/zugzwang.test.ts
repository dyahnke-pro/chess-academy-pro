import { describe, it, expect } from 'vitest';
import { readZugzwang, zugzwangSentence, passFen } from './zugzwang';
import type { TablebaseMovesResult } from './endgameTablebaseService';

// King and pawn: White Kd6, Pd5? — keep it to the lookup: the tablebase is mocked
// by side to move, which is all the reader consults.
const FEN = '3k4/8/3K4/3P4/8/8/8/8 b - - 0 1';
const lookup = (byTurn: Record<'w' | 'b', string>) => async (fen: string): Promise<TablebaseMovesResult> =>
  ({ category: byTurn[fen.split(' ')[1] as 'w' | 'b'] as TablebaseMovesResult['category'], moves: [] });

describe('readZugzwang', () => {
  it('the side to move is worse off than if it could pass', async () => {
    // Black to move draws; with White to move, White would… draw too → no zugzwang.
    expect(await readZugzwang(FEN, lookup({ b: 'draw', w: 'draw' }))).toBeNull();
    // Black to move loses; White to move would only draw → zugzwang for Black.
    const z = await readZugzwang(FEN, lookup({ b: 'loss', w: 'draw' }));
    expect(z).toEqual({ onMove: -1, ifPassed: 0, mutual: false });
    expect(zugzwangSentence(z!, true)).toBe('Zugzwang: on your move this loses; if it were their move, you would hold the draw. In pawn endings, who has to move decides it.');
  });
  it('mutual zugzwang: whoever moves loses', async () => {
    const z = await readZugzwang(FEN, lookup({ b: 'loss', w: 'loss' }));
    expect(z?.mutual).toBe(true);
    expect(zugzwangSentence(z!, false)).toMatch(/^You put them in mutual zugzwang/);
  });
  it('no pass when the side to move is in check', () => {
    expect(passFen('3k4/3Q4/3K4/8/8/8/8/8 b - - 0 1')).toBeNull();
  });
});

describe('findTriangulation', async () => {
  const { findTriangulation } = await import('./zugzwang');
  it('a king loop that hands the move over is found', () => {
    // White's king walks e4-d4-d3-e4 (three moves), Black's goes e6-e7-e6 (two):
    // the same placement, with Black to move.
    expect(findTriangulation('8/8/4k3/8/4K3/8/8/8 w - - 0 1', ['Kd4', 'Ke7', 'Kd3', 'Ke6', 'Ke4'])).toEqual({ plies: 5, squares: ['d4', 'd3', 'e4'] });
  });
  it('a line with a pawn move, or that never comes back, is not one', () => {
    expect(findTriangulation('8/8/4k3/8/4K3/8/4P3/8 w - - 0 1', ['e3', 'Ke7', 'Kd4', 'Ke6', 'Ke4'])).toBeNull();
    expect(findTriangulation('8/8/4k3/8/4K3/8/8/8 w - - 0 1', ['Kd4', 'Ke7', 'Kd3', 'Ke6', 'Kc3'])).toBeNull();
  });
});
