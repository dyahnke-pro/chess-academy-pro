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

  it('a DEFENDED piece hit by a cheaper attacker: the net, not the count (Learn walk 2026-10-13)', () => {
    // Black knight f6 guarded by the g7 pawn and the d8 queen; White pawn on g5
    // hits it. Black to move. Guarded twice — and still a knight for a pawn.
    const fen = '3qk3/5ppp/5n2/6P1/8/8/8/4K3 b - - 0 1';
    const p = threatProof(fen, 'b', ['f6']);
    expect(p?.short).toBe('gxf6 wins your knight for their pawn, even after you take back');
    expect(p?.short).not.toMatch(/\d+ points?/);
    expect(p?.short).not.toMatch(/guarded/);
    expect(p?.full).toBe('gxf6 wins your knight for their pawn, even after you take back — the guards only win back the cheaper piece');
  });
});
