// THE BLOCKADER IS TIED TO IT (Danya, "miracle on the chess board" board 4:
// "Black's rook is tied down (to blockading b5)"). The app said the pawn's
// half ("it cannot move while the rook stays") and never the rook's.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { blockaderTied, passerTrumpSentence } from './nextPlans';

const MIRACLE = '6k1/6p1/1r5p/1P3p2/1R2p1P1/3p3P/3RnP1K/8 b - - 0 41';

describe('a blockader with no other cover of the pawn\'s path is tied to it', () => {
  it('Danya\'s board: the rook on b6 is Black\'s only cover of b6–b8', () => {
    expect(blockaderTied(new Chess(MIRACLE), 'b5', 'w', 'b6')).toBe(true);
    // Black's seat (the blockader's): the cost is said.
    expect(passerTrumpSentence(MIRACLE, 'b5', false)).toMatch(/your rook is tied to that job: nothing else of yours covers the pawn's path/);
    // White's seat: the same fact as the passer's owner hears it.
    expect(passerTrumpSentence(MIRACLE, 'b5', true)).toMatch(/That rook is tied to the job: nothing else of theirs covers the pawn's path/);
  });
  it('another piece on the path\'s squares frees it', () => {
    // Black's king on c8 covers b7 and b8.
    const kingNear = '2k5/6p1/1r5p/1P3p2/1R2p1P1/3p3P/3RnP1K/8 b - - 0 41';
    expect(blockaderTied(new Chess(kingNear), 'b5', 'w', 'b6')).toBe(false);
    expect(passerTrumpSentence(kingNear, 'b5', false)).not.toMatch(/tied/);
  });
});

// ONE PLAN, ONE CLAIM (the same miracle board, the spoken read): the board's
// plan (`planOfTheBoard`) and the structure plan (`boardPlans`) both said
// "The plan from here is to win their weak pawn on b5. Here's how: …" — the
// same `deriveNextPlanFacts` plan under two claims, so it never folded.
describe('the board\'s plan and the structure plan claim one plan', () => {
  it('both carry nextPlanClaim for the weak pawn on b5', async () => {
    const { readBoard, readBoardAll } = await import('./boardComputers');
    // Stockfish, depth 12, Black to move (recorded for the spoken-read bench).
    const lines = [{ moves: ['e2c3', 'g4f5', 'b6b5', 'b4b5', 'c3b5', 'h2g3', 'g8f7', 'g3f4', 'b5d6'], evaluation: 50, mate: null }];
    const plan = readBoard('planOfTheBoard', { fen: MIRACLE, lines, student: 'b', namesMoves: true });
    const structure = readBoardAll('boardPlans', { fen: MIRACLE, student: 'b', withTrump: true });
    expect(plan?.text).toMatch(/weak pawn on b5/);
    const said = structure.find((f) => /weak pawn on b5/.test(f.text));
    expect(said).toBeTruthy();
    expect(plan?.claims.some((c) => said?.claims.includes(c))).toBe(true);
  }, 60000);
});
