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
