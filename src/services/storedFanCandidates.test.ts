import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { storedFanBefore, storedIntentReads } from './moveIntent';

// David 2026-11-16: "Make sure to wire in the missing review builds." Review
// stored a read for every move a player weighs (`weighed`) and its move thought
// never saw them, so the in-between move and the fighting line could not run.

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const FEN = fenAfter(['e4', 'c6', 'd4', 'd5', 'e5']);                    // Black to move
const REC = {
  bestMove: 'c8f5', bestMoveEval: 30, evaluation: 40,
  pv: { afterPlayed: ['g1f3'], afterBest: ['g1f3'] },
  weighed: { depth: 14, reads: [
    { moves: ['e7e6', 'g1f3'], evaluation: 60, mate: null, earlier: ['e7e6'] },  // worse for Black
    { moves: ['c6c5', 'd4c5'], evaluation: 45, mate: null },
    { moves: ['c8f5', 'g1f3'], evaluation: 30, mate: null },                      // the best, already in the fan
  ] },
};

describe("Review's thought reads the stored candidates", () => {
  it('the board-before fan carries every weighed move, ranked by the mover', () => {
    const before = storedIntentReads(FEN, 'h6', REC)!.before;
    expect(before.map((l) => l.moves[0])).toEqual(['c8f5', 'h7h6', 'c6c5', 'e7e6']);
    expect(before.map((l) => l.rank)).toEqual([1, 2, 3, 4]);
    expect(before.find((l) => l.moves[0] === 'e7e6')?.earlier).toEqual({ depth: 12, moves: ['e7e6'] });
  });
  it("NEGATIVE CONTROL: the record's posed reason keeps its two-line fan", () => {
    expect(storedFanBefore(REC, 'h7h6').map((l) => l.moves[0])).toEqual(['c8f5', 'h7h6']);
  });
  it('a record with no weighed reads reads as before', () => {
    const { weighed: _w, ...bare } = REC;
    expect(storedIntentReads(FEN, 'h6', bare)!.before.map((l) => l.moves[0])).toEqual(['c8f5', 'h7h6']);
  });
});
