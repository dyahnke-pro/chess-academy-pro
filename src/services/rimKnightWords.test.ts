// A KNIGHT ON THE RIM IS SHORT OF SQUARES, NOT STUCK (Danya's article boards,
// 2026-11-18, "how to ignore a threat and win" #0): the position read called
// the h4 knight "your problem piece, stuck on the rim" while the engine's best
// move is that knight's own way out, Nhf5. The read now says what is true on
// every board: where it stands and how few squares it reaches from there.
import { describe, it, expect } from 'vitest';
import { readPosition } from './positionalRead';

const FEN = 'r2r2k1/1pqn1pp1/2nRb2p/2p5/p1P1P2N/P5NP/1PQ1BPP1/3R2K1 w - - 0 26';

describe('the rim knight in the position read', () => {
  it('is never called stuck, and its squares are counted', () => {
    const text = readPosition(FEN, 'white').map((o) => o.text).join(' ');
    expect(text).not.toMatch(/stuck on the rim/);
    expect(text).toMatch(/knight on h4 is your problem piece, out on the rim, where it reaches only 4 squares/);
  });
});
