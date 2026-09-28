// Claim check 2026-09-27 (amateur game 174083521118, ply 64): "The rook on e6
// stands behind its own e2 pawn" with the rook on e8 — the technique was found
// down the engine's line (…Re6) and spoken as if it stood on the board.
import { describe, it, expect } from 'vitest';
import { conceptForLine } from './conceptEngine';

const FEN = '4r2k/pp1R2pp/2r5/2P5/1P4P1/7P/3Kp3/4R3 b - - 2 33';
const PV = ['c6e6', 'd7b7', 'e8d8', 'd2c2', 'h7h6', 'b7a7'];

describe('a technique found down the line carries the line that reaches it', () => {
  it('the e6 rook of the engine line comes with "Re6" and its board', () => {
    const tech = conceptForLine({ fen: FEN, uci: PV, studentColor: 'b' }).find((c) => c.source === 'technique');
    expect(tech).toBeDefined();
    expect(tech?.full).toMatch(/rook on e6/);
    expect(tech?.line?.[0]).toBe('Rce6');
    expect(tech?.boardFen).toBeDefined();
  });
});
