import { describe, it, expect } from 'vitest';
import { readBoardAll } from './boardComputers';

// "X or Y — both keep the win, so take your pick" is one idea: one claim, so
// the say-once ledger says it once a game (55 times in 20 Danya Review tapes).
// Engine reads (depth 18, white's view) of two of those boards.
const read = (uci: string, cp: number) => ({ evaluation: cp, mate: null, moves: [uci], earlier: null });
describe('both keep the win is one claim, whatever the moves', () => {
  it('two boards, two pairs of moves, the same claim', () => {
    const a = readBoardAll('alsoGood', { fenBefore: 'r1bq3r/pp2k3/n1pp3n/4p3/4P3/P1N2N1P/1PPQBPP1/2KR3R w - - 0 16', san: 'Nxe5', student: 'w', rating: 1500,
      reads: [read('f3e5', 738), read('e2a6', 699), read('e2c4', 629), read('d2g5', 615)] });
    const b = readBoardAll('alsoGood', { fenBefore: 'rn1q1rk1/pp6/2pbb1pp/3p1p2/3PB3/2N1P3/PPP3PP/R1BQK2R b KQ - 0 14', san: 'fxe4', student: 'b', rating: 1500,
      reads: [read('f5e4', -638), read('d5e4', -576), read('d8h4', -352), read('b8d7', -184)] });
    expect(a.map((f) => f.text).join(' ')).toMatch(/take your pick/);
    expect(a.flatMap((f) => f.claims)).toEqual(['also-good:both-win']);
    // …and where the board separates them, it says how (Danya: "it opens the
    // f-file, a road for the rooks").
    expect(b.map((f) => f.text).join(' ')).toMatch(/…fxe4 opens the f-file for your rook on f8, and …dxe4 keeps it shut/);
  });
});
