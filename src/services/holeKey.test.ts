// OS-11 #5: the d5 hole said twice in g3 — "c5 has a cost for them: no pawn of
// theirs can cover d5" (openingStory, 10.Nf3) and "that square stays a hole for
// them" (pawnJudgement, 11.O-O). One fact, one key: `hole:d5`.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { openingStoryAt } from './openingStory';
import { mirroredAsymmetry } from './pawnJudgement';
import { holeKey } from './conceptKey';

const G3 = 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4 O-O Nc2 Re8 d3 b5 Nf3 c5 O-O Bc7'.split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const m of G3.slice(0, n)) c.move(m); return c.fen(); };

describe('one hole claim across producers (g3 d5)', () => {
  it('the story\'s cost beat after 10…c5 keys hole:d5', () => {
    const story = openingStoryAt({ history: G3.slice(0, 20), student: 'w', namesStudentMoves: false, movesAt: () => null });
    const gift = story.find((f) => f.beat === 'consequence' && f.squares.includes('d5'));
    expect(gift?.claimKey).toBe(holeKey('d5'));
  });
  it('the pawn read after 11…Bc7 keys the same hole', () => {
    expect(fenAt(22)).toBe('r1bqr1k1/2bp1ppp/p4n2/npp1p3/2P5/1P1PPN2/PBN1BPPP/R2Q1RK1 w - - 2 12');
    expect(mirroredAsymmetry(fenAt(22), 'w')?.key).toBe(holeKey('d5'));
  });
});
