import { describe, it, expect } from 'vitest';
import { phraseBadPiece } from './pieceQuality';

// Clean-pass walk 2026-10-04, review G1 #45: the opponent's passive pieces were
// spoken to the student as "improving them is the biggest gain on the board".
describe('a bad piece is advice only for its owner', () => {
  const fact = 'the knight on b7 and the bishop on f5 are both passive';
  it('the opponent pieces are to keep shut in, never to improve', () => {
    const t = phraseBadPiece(fact, 'b', true, 'w');
    expect(t).not.toMatch(/improving them/);
    expect(t).toMatch(/keep them shut in/);
  });
  it('the student own piece is to improve', () => {
    expect(phraseBadPiece('the bishop on a3 is doing nothing where it sits', 'w', false, 'w')).toMatch(/improving it is the biggest gain/);
  });
});
