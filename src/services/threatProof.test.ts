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
    expect(p?.full).toMatch(/They threaten Ra1, and it is mate/);
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
    expect(p?.short).toMatch(/^gxf6 .*your knight.*their pawn|^gxf6 .*their pawn for your knight/);
    expect(p?.short).toMatch(/take back|taking back/);
    expect(p?.short).not.toMatch(/\d+ points?/);
    expect(p?.short).not.toMatch(/guarded/);
    expect(p?.full).toBe(p?.short);
  });

  // THE TAPE (Learn 2026-10-28): four threats in a game, each "Bxd4 wins your
  // queen for their bishop, even after you take back." — one sentence four
  // times. The words rotate on the threat; the same threat keeps its words.
  it('different threats do not all say the same sentence; one threat always does', () => {
    const FENS: Array<[string, string]> = [
      ['3qk3/5ppp/5n2/6P1/8/8/8/4K3 b - - 0 1', 'f6'],
      ['4k3/8/1p6/q7/8/8/3B4/3QK3 b - - 0 1', 'a5'],
      ['3rk3/8/8/6B1/8/8/8/4K3 b - - 0 1', 'd8'],
      ['4k3/8/8/4p3/3q4/4B3/8/4K3 b - - 0 1', 'd4'],
      ['4k3/8/8/4p3/3N4/2P5/8/4K3 w - - 0 1', 'd4'],
      ['4k3/8/8/2b5/3Q4/2P5/8/4K3 w - - 0 1', 'd4'],
    ];
    const said = FENS.map(([fen, sq]) => threatProof(fen, fen.split(' ')[1] as 'w' | 'b', [sq])?.short ?? '');
    for (const t of said) expect(t).toMatch(/take back|taking back/i);
    const shape = (t: string): string => t.replace(/^\S+ /, '').replace(/\b(pawn|knight|bishop|rook|queen)\b/g, 'P');
    expect(new Set(said.map(shape)).size).toBeGreaterThan(1);
    expect(threatProof(FENS[1][0], 'b', [FENS[1][1]])?.short).toBe(said[1]);
    // The capture is said once: SAN read aloud is already a verb ("h-pawn
    // takes g4"), so it is never followed by "takes" (prod walk 2026-10-29).
    for (const t of said) expect(t).not.toMatch(/^[KQRBN]?[a-h]?[1-8]?x[a-h][1-8]\S* takes /);
  });
});
