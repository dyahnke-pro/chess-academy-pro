import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deriveNextPlanFacts, findWorstPlacedPiece, worstPieceNote } from './nextPlans';
import { pieceWish } from './pieceWish';
import { methodRead, methodLine } from './planChoice';
import { assemblePieceActivityAnswer } from './groundedAnswer';
import { explainEvalByPieceQuality } from './pieceQuality';

// ONE WORST PIECE (WO-DEPTH-01, David 2026-11-08). Five readers answered "which
// of your pieces is worst" with five picks, so one board could name two. On
// David's first 120 games 64 boards did: Learn's wish named one piece while the
// plan method named another.
//
// David's game chesscom-1002984876 (he is Black) after 20…Nh3 (ply 40): the
// wish said "Your knight on h3 is stuck on the rim. It wants f4"; the method,
// on the same board, said "Your worst piece: your rook on a8, with no open file
// yet"; chat said a third.
const H3 = 'r1k5/p1pn3p/8/1pb3p1/8/5PBn/PPP1N2P/2K2R2 w - - 2 21';

describe('one board, one worst piece', () => {
  it('the finder names the knight on h3, stuck on the rim', () => {
    expect(findWorstPlacedPiece(new Chess(H3), 'b')).toMatchObject({ sq: 'h3', type: 'n', kind: 'rim-knight' });
  });

  it('the plan, the wish, the method, the note and chat all name it', () => {
    const plan = deriveNextPlanFacts(H3, 'b', { namesStudentMoves: true }).find((p) => p.kind === 'worst-piece');
    expect(plan?.squares[0]).toBe('h3');
    expect(plan?.text).toContain('rescue your worst piece, the knight on h3, which is stuck on the rim');
    expect(pieceWish(H3, 'b', null)?.square).toBe('h3');
    const read = methodRead(H3, 'b', false);
    expect(read?.worst?.square).toBe('h3');
    expect(methodLine(read!, H3)).toContain('Your worst piece: your knight on h3.');
    expect(worstPieceNote(H3, 'b')?.square).toBe('h3');
    expect(assemblePieceActivityAnswer(H3, 'what is my worst piece?', 'black')?.facts)
      .toBe('Your worst piece is the knight on h3 — it is stuck on the rim. It wants f4 — an outpost no pawn can chase it from, and the g-pawn backs it up.');
  });

  it('the wish and the plan send it to the same square', () => {
    const plan = deriveNextPlanFacts(H3, 'b', { namesStudentMoves: true }).find((p) => p.kind === 'worst-piece');
    const wish = pieceWish(H3, 'b', null);
    expect(wish?.target).toBe('f4');
    expect(plan?.squares).toContain(wish?.target);
    expect(methodRead(H3, 'b', false)?.worst?.step).toBe('walk your knight to f4');
  });

  it('a wish never names another piece in place of the one the move just put there', () => {
    expect(pieceWish(H3, 'b', 'h3')).toBeNull();
  });

  it('Review\'s ablation proves the finder\'s piece, never one of its own', async () => {
    // Every relocation of a black piece swings the eval the same: whichever
    // piece the ablation tests first is the one it names.
    const res = await explainEvalByPieceQuality(H3, async (f) => ({ cp: f === H3 ? 0 : -200 }));
    const black = res?.delta?.color === 'b' ? res.delta : null;
    expect(black?.squares[0]).toBe('h3');
    expect(black?.text).toContain('the knight on h3 is stuck on the rim, so it is doing nothing');
  });
});
