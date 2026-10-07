import { describe, expect, it } from 'vitest';
import { trapMoveNoun } from './learnBoardTeaching';

// Clean-pass walk 2026-10-03, G3 ply 10 (lichess mZ1GOTOw, Berlin): "your pawn
// taking their bishop on c6 looks natural … walks into a known trap" — the b-
// and the d-pawn can both take on c6; which one is the trap was not said.
const FEN = 'r1bqkb1r/pppp1ppp/2Bn4/4p3/3P4/5N2/PPP2PPP/RNBQ1RK1 b kq - 0 6';

describe('the trap warning says which pawn', () => {
  // The gem on this board wins less than a piece, so since F04 (2026-10-07) it
  // no longer fires a trap warning; the naming is tested where it lives.
  it('names the file when both pawns can take', () => {
    expect(trapMoveNoun('dxc6', FEN)).toBe('your d-pawn taking their bishop on c6');
    expect(trapMoveNoun('bxc6', FEN)).toBe('your b-pawn taking their bishop on c6');
  });
});
