// THE STUDENT'S MOVE IS THE SUBJECT — "Your e6 let them…", never a sentence
// opening on a lowercase bare pawn move (OS-11 2026-10-20: "e6 let them play g5,
// which attacks the knight on f6.").
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { backwardLook } from './backwardLook';
import { withOneSearch } from '../test/oneSearchScores';

describe('the drawback lane names the student\'s move as theirs', () => {
  it('a pawn move that lets them hit the knight reads "Your e6 let them…"', () => {
    // Black to move: …e6 leaves the knight on f6 to g4–g5.
    const fenBefore = 'r1bqkb1r/pppppppp/2n2n2/8/4P1P1/2N5/PPPP1P1P/R1BQKBNR b KQkq - 0 3';
    const after = new Chess(fenBefore); after.move('e6');
    const look = backwardLook(withOneSearch({
      priorMove: null, replySan: null,
      fenBefore, fenAfter: after.fen(), playedSan: 'e6', bestSan: null,
      cpLoss: 180, studentColor: 'black',
      replyPvUci: ['g4g5', 'f6h5', 'd1h5'],
    }));
    expect(look, 'the drawback lane said nothing on this board').not.toBeNull();
    expect(look!.line).toMatch(/^Your e6 /);
    expect(look!.line).not.toMatch(/^[a-h][1-8]\b/);
  });
});
