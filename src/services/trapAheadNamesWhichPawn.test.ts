import { describe, expect, it, vi } from 'vitest';
import { trapAheadAt, warmGemIndexes } from './gemCrushLines';
import { trapAheadTeaching } from './learnBoardTeaching';

// Clean-pass walk 2026-10-03, G3 ply 10 (lichess mZ1GOTOw, Berlin): "your pawn
// taking their bishop on c6 looks natural … walks into a known trap" — the b-
// and the d-pawn can both take on c6; which one is the trap was not said.
const FEN = 'r1bqkb1r/pppp1ppp/2Bn4/4p3/3P4/5N2/PPP2PPP/RNBQ1RK1 b kq - 0 6';

describe('the trap warning says which pawn', () => {
  it('names the file when both pawns can take', async () => {
    warmGemIndexes();
    await vi.waitFor(() => { expect(trapAheadAt(FEN)).not.toBeNull(); }, { timeout: 20_000 });
    const t = trapAheadTeaching(FEN, 'b');
    expect(t!.text).toMatch(/your [bd]-pawn taking their bishop on c6/);
  }, 30_000);
});
