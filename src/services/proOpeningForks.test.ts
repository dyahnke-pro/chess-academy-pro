import { describe, it, expect } from 'vitest';
import { buildProOpeningForkTree } from './proOpeningForks';
import type { ProGameReference } from '../types';

function game(id: string, pgn: string, over: Partial<ProGameReference> = {}): ProGameReference {
  const plies = pgn.trim().split(/\s+/).length;
  return {
    id, playerId: 'naroditsky', openingId: 'caro-kann', proOpeningId: 'pro-naroditsky-caro-kann',
    variation: 'classical', variationLabel: 'Classical (4…Bf5)',
    white: 'opp', black: 'naroditsky', studentSide: 'black', result: '0-1',
    opponentRating: 2500, date: '2024-01-01', source: 'chess.com', url: null,
    eco: 'B10', plyCount: plies, pgn, ...over,
  };
}

describe('buildProOpeningForkTree', () => {
  // Black (the pro) shares e4 c6 d4, then diverges on his 2nd move (ply 3):
  // 3 games play …d5, 2 play …g6 — a real fork on the PRO's move.
  const games: ProGameReference[] = [
    game('a', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6'),
    game('b', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5'),
    game('c', 'e4 c6 d4 d5 Nd2 dxe4 Nxe4 Nd7'),
    game('d', 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d6'),
    game('e', 'e4 c6 d4 g6 Nc3 Bg7 Be3 Nf6'),
  ];

  it('returns null with fewer than 2 games', () => {
    expect(buildProOpeningForkTree([games[0]])).toBeNull();
    expect(buildProOpeningForkTree([])).toBeNull();
  });

  it('aggregates the shared spine (majority line)', () => {
    const t = buildProOpeningForkTree(games)!;
    expect(t).not.toBeNull();
    expect(t.gameCount).toBe(5);
    expect(t.studentSide).toBe('black');
    // majority: e4 c6 d4 d5 (d5 in 3 games beats g6 in 2)
    expect(t.spine.slice(0, 4).map((s) => s.san)).toEqual(['e4', 'c6', 'd4', 'd5']);
  });

  it('records a fork on the PRO\'s move where his games diverge (…d5 vs …g6)', () => {
    const t = buildProOpeningForkTree(games)!;
    const fork = t.forks.find((f) => f.ply === 3); // Black's 2nd move
    expect(fork).toBeTruthy();
    const byCount = Object.fromEntries(fork!.branches.map((b) => [b.san, b.count]));
    expect(byCount.d5).toBe(3);
    expect(byCount.g6).toBe(2);
    // history to the fork is the shared line e4 c6 d4
    expect(fork!.historySans).toEqual(['e4', 'c6', 'd4']);
    // each branch carries a representative game
    expect(fork!.branches.every((b) => b.sample && b.sample.pgn)).toBe(true);
  });

  it('does NOT record a fork on the OPPONENT\'s move (Nc3 vs Nd2 is White\'s choice)', () => {
    const t = buildProOpeningForkTree(games)!;
    // ply 4 is White's 3rd move (Nc3 in 2, Nd2 in 1) — not the pro's, so no fork.
    expect(t.forks.some((f) => f.ply === 4)).toBe(false);
  });

  it('a one-off alternative (single game) is not a fork', () => {
    // 3 identical + 1 lone deviation on the pro's move → no fork (needs ≥2 each).
    const g = [
      game('a', 'e4 c6 d4 d5 Nc3 dxe4'),
      game('b', 'e4 c6 d4 d5 Nc3 dxe4'),
      game('c', 'e4 c6 d4 d5 Nc3 dxe4'),
      game('d', 'e4 c6 d4 Nf6'), // lone …Nf6 (1 game)
    ];
    const t = buildProOpeningForkTree(g)!;
    expect(t.forks.find((f) => f.ply === 3)).toBeUndefined();
  });
});
