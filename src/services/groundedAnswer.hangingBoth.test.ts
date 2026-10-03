// "What's hanging?" after 13.Nxe5 (question walk 2026-09-27) answered "Nothing
// of yours is hanging" with their knight on e5 waiting to be taken back.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { assembleHangingAnswer } from './groundedAnswer';

const c = new Chess();
for (const s of 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5'.split(' ')) c.move(s);
const FEN = c.fen();

describe('what is hanging reads the whole board', () => {
  it('unscoped: names their loose knight', () => {
    const a = assembleHangingAnswer(FEN, "What's hanging?", 'black');
    expect(a?.facts).toMatch(/Nothing of yours is hanging\. Their knight on e5 is loose — you can win about 3 points/);
  });
  it('scoped to mine: only mine (negative control)', () => {
    const a = assembleHangingAnswer(FEN, 'Is any of my pieces hanging?', 'black');
    expect(a?.facts).toBe('Nothing of yours is hanging — your pieces are all defended.');
  });
});

describe('a recapture takes back, it does not win', async () => {
  const { explainBestMoveGrounded } = await import('./groundedAnswer');
  it('…dxe5 after 13.Nxe5', () => {
    const why = explainBestMoveGrounded(FEN, null, 'd6e5', 'black', { square: 'e5', capturedValue: 3 }, null) ?? '';
    expect(why).toMatch(/takes back the knight on e5/);
    expect(why).not.toMatch(/wins the knight/);
  });
});
