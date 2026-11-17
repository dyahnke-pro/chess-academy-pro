// Real games from his speedruns (S4): one piece moved again while the others wait.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pieceMovedAgain } from './pieceMovedAgain';
import { readBoardAll } from './boardComputers';

const fenOf = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
// aEKSPF: Bb5+, Be2, Bg4, Bh5+, then back to e2 after …g6.
const AEK = ['e3', 'e5', 'Nc3', 'd5', 'd4', 'e4', 'Bb5+', 'c6', 'Be2', 'Bd6', 'Bg4', 'f5', 'Bh5+', 'g6'];

describe('pieceMovedAgain', () => {
  it('aEKSPF 8.Be2: the bishop\'s fifth move, back on e2 after the g6 pawn kicked it', () => {
    const r = pieceMovedAgain(AEK, 'Be2', 'b', 0);
    expect(r?.kind).toBe('back');
    expect(r?.text).toMatch(/fifth move/);
    expect(r?.text).toMatch(/back on e2/);
    expect(r?.text).toMatch(/pawn on g6 kicked it/);
    expect(r?.text).toMatch(/knight on g1 and bishop on c1/);
  });

  it('4e6z 4…Bg4: two moves to reach g4, a square it could have reached from c8 in one', () => {
    const r = pieceMovedAgain(['Nf3', 'Nf6', 'd4', 'd5', 'e3', 'Bd7', 'Bd3'], 'Bg4', 'b', 19);
    expect(r?.kind).toBe('detour');
    expect(r?.text).toMatch(/your bishop/);
    expect(r?.text).toMatch(/g4/);
    expect(r?.text).toMatch(/c8/);
  });

  it('negative control: Bd7 then Bc6 — c6 was never reachable from c8 in one', () => {
    expect(pieceMovedAgain(['Nf3', 'Nf6', 'd4', 'd5', 'e3', 'Bd7', 'Bd3'], 'Bc6', 'b', 40)).toBeNull();
  });

  it('negative control: a capture or a check is the move\'s own reason', () => {
    // aEKSPF 7.Bh5+ is the bishop's fourth move, with check.
    expect(pieceMovedAgain(AEK.slice(0, 12), 'Bh5+', 'b', 0)).toBeNull();
  });

  it('through the registry, only on the game that reaches this board', () => {
    const fenBefore = fenOf(AEK);
    expect(readBoardAll('pieceMovedAgain', { history: AEK, fenBefore, san: 'Be2', student: 'b', costCp: 0 })[0]?.seat).toBe('opponent');
    // Another board: the moves are not this board's game.
    expect(readBoardAll('pieceMovedAgain', { history: AEK, fenBefore: new Chess().fen(), san: 'Be2', student: 'b', costCp: 0 })).toEqual([]);
  });
});
