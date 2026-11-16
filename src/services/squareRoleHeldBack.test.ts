/**
 * A PUSH IS HELD BACK ONLY WHEN IT WOULD LOSE THE PAWN (Review prod audit
 * 2026-11-16, Giri–Carlsen 6.Be2): "Their bishop bears down on c4, holding
 * back your c-pawn" — c4 is guarded by the pawn on d5, so …c4 stands; the
 * bishop covers the square once and the square is held once.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { squareRole } from './squareRole';

// After 6.Be2 (Black to move): Be2 covers c4, the d5 pawn guards it.
const AFTER_BE2 = 'r2qkbnr/pp1b1ppp/2n1p3/2ppP3/3P4/2P2N2/PP2BPPP/RNBQK2R b KQkq - 3 6';

describe('squareRole: holding back a pawn', () => {
  it('a push square guarded as often as it is covered holds nothing back', () => {
    expect(squareRole(new Chess(AFTER_BE2), 'c4', 'w', 'your', 'covers') ?? '').not.toMatch(/holding back/);
  });
  it('NEGATIVE CONTROL: a push square covered with no guard is held back', () => {
    // The d5 pawn gone: c4 is covered by the bishop and guarded by nothing.
    const board = 'r2qkbnr/pp1b1ppp/2n1p3/2p1P3/3P4/2P2N2/PP2BPPP/RNBQK2R b KQkq - 3 6';
    expect(squareRole(new Chess(board), 'c4', 'w', 'your', 'covers') ?? '').toMatch(/holding back your c-pawn/);
  });
});
