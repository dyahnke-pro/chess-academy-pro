// The would-be pinner is itself pinned (teach-brief §3): Bg5 "pins" Nf6 to the
// queen, but …Bh6 pins Bg5 to its own king on e3 — Bxd8 would be illegal.
import { describe, it, expect } from 'vitest';
import { detectTactics } from './tacticsDetector';

const pins = (fen: string): string[][] => detectTactics(fen).tactics.filter((t) => t.type === 'pin').map((t) => t.involvedSquares);

describe('a pin whose pinner cannot take is not a pin', () => {
  it('Bg5 pinned to its king by …Bh6 pins nothing', () => {
    expect(pins('3qk3/8/5n1b/6B1/8/4K3/8/8 b - - 0 1')).not.toContainEqual(['g5', 'f6', 'd8']);
  });
  it('the same pin with the pinner free stands', () => {
    expect(pins('3qk3/8/5n2/6B1/8/4K3/8/8 b - - 0 1')).toContainEqual(['g5', 'f6', 'd8']);
  });
});
