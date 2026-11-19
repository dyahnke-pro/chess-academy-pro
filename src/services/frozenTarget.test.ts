import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { frozenTarget } from './frozenTarget';

function after(fen: string, sans: string[]): string {
  const c = new Chess(fen);
  for (const s of sans) c.move(s);
  return c.fen();
}

// the-positional-sacrifice#2: White's Kd3, …Rg8. The isolated a6 pawn is
// blocked by a5, no black pawn on the b-file can come to it, the knight (via
// b4) and the rook (b6, guarded by a5) reach it, and only the rook (a8) guards.
const START = '2r5/2k2p2/p1Np1p1p/P2Pp3/2P2bPP/8/4K3/1R6 w - - 2 37';
const BOARD = after(START, ['Kd3', 'Rg8']);

describe('frozenTarget', () => {
  it('reads the a6 pawn that falls, the count and the freeze', () => {
    const r = frozenTarget(BOARD, 'w');
    expect(r).not.toBeNull();
    expect(r!.side).toBe('w');
    expect(r!.pawn).toBe('a6');
    expect(r!.attackers.map((a) => a.square)).toEqual(['b1', 'c6']);
    expect(r!.defenders.map((d) => d.square)).toEqual(['g8']);
    expect(r!.text).toMatch(/^Their pawn on a6 (will fall|cannot be held)\./);
    // Each piece by what it is, no list of squares read aloud (the board lights b1 and c6).
    expect(r!.text).toContain('Two of your pieces can reach it, your rook and knight, and only one of theirs can guard it.');
    expect(r!.squares).toEqual(expect.arrayContaining(['b1', 'c6']));
  });

  it('says it to the side losing the pawn', () => {
    const r = frozenTarget(BOARD, 'b');
    expect(r!.text).toMatch(/^Your pawn on a6/);
    expect(r!.text).toContain('of their pieces can reach it');
  });

  it('negative control: a pawn on the b-file that can come to guard it', () => {
    // Same board, a black pawn on b7: a6 is no longer frozen.
    const withB = '6r1/1pk2p2/p1Np1p1p/P2Pp3/2P2bPP/3K4/8/1R6 w - - 4 38';
    expect(frozenTarget(withB, 'w')).toBeNull();
    expect(frozenTarget(new Chess().fen(), 'w')).toBeNull();
  });

  it('negative control: guards equal to attackers', () => {
    // The black rook on a8 and the king on b7 (the white rook gone from b1): one attacker, two guards.
    expect(frozenTarget('r7/1k3p2/p1Np1p1p/P2Pp3/2P2bPP/3K4/8/8 w - - 0 40', 'w')).toBeNull();
  });
});
