import { describe, it, expect } from 'vitest';
import { threatProof, provenThreatLine } from './threatProof';

describe('threatProof — the cost a threat warning claims, proven on the board', () => {
  it('a hanging knight: the count and the free capture', () => {
    // White knight on e5, attacked by Black's queen on e7, nothing guards it; White to move.
    const fen = '4k3/4q3/8/4N3/8/8/8/4K3 w - - 0 1';
    const p = threatProof(fen, 'w', ['e5']);
    expect(p?.exact).toBe(true);
    expect(p?.full).toMatch(/attacked once and nothing guards it: Qxe5\+ — they win a knight/);
    expect(p?.squares).toEqual(['e5', 'e7']);
  });

  it('a mate threat: names the mating move', () => {
    // Back-rank: Black rook on a8 mates on a1; White king boxed by its pawns.
    const fen = 'r3k3/8/8/8/8/8/5PPP/6K1 w - - 0 1';
    const p = threatProof(fen, 'w', []);
    expect(p?.full).toMatch(/They threaten Ra1#, and it is mate/);
  });

  it('nothing at stake: no proof, the line stays bare', () => {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    expect(threatProof(fen, 'w', ['e1'])).toBeNull();
    expect(provenThreatLine('Watch out — x.', fen, 'w', []).text).toBe('Watch out — x.');
  });
});
