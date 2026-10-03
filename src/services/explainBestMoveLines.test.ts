// WO-OUTCOME-01 B: with the engine's lines in hand, "your move let them play X,
// winning the Y" is what the ledger settles over the played line — never a
// one-square swap count the line itself does not play.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { explainBestMoveGrounded } from './groundedAnswer';

const c = new Chess();
for (const m of ['e4', 'e5', 'Nf3']) c.move(m);
const FEN = c.fen(); // Black to move; …Qg5 puts the queen where Nf3 hits it.

describe('explainBestMoveGrounded reads the line when it has one', () => {
  it('says the queen falls when the line takes it', () => {
    const out = explainBestMoveGrounded(FEN, 'Qg5', 'b8c6', 'black', null, { afterPlayed: ['f3g5'], afterBest: null });
    expect(out ?? '').toMatch(/let them play Nxg5, winning the queen/);
  });
  it('says nothing about the queen when the line never takes it', () => {
    const out = explainBestMoveGrounded(FEN, 'Qg5', 'b8c6', 'black', null, { afterPlayed: ['d2d4', 'g5g2'], afterBest: null });
    expect(out ?? '').not.toMatch(/winning the queen/);
  });
  it('with no line it falls back to the board count', () => {
    const out = explainBestMoveGrounded(FEN, 'Qg5', 'b8c6', 'black', null, null);
    expect(out ?? '').toMatch(/winning the queen/);
  });
});
