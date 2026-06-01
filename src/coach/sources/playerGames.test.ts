import { describe, it, expect } from 'vitest';
import { loadPlayerGamesForLive } from './playerGames';
import proGameReferencesData from '../../data/pro-game-references.json';
import type { ProGameReference } from '../../types';

const REFS = proGameReferencesData as unknown as ProGameReference[];
const SAMPLE = REFS[0];

describe('loadPlayerGamesForLive', () => {
  it('returns null when no opening can be resolved', () => {
    expect(loadPlayerGamesForLive({ openingName: null, moveHistory: [] })).toBeNull();
  });

  it('scopes to a single pro opening via proOpeningId', () => {
    const ctx = loadPlayerGamesForLive({
      openingName: null,
      moveHistory: [],
      proOpeningId: SAMPLE.proOpeningId,
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.playerId).toBe(SAMPLE.playerId);
    expect(ctx!.games.length).toBeGreaterThan(0);
    expect(ctx!.games.length).toBeLessThanOrEqual(4);
    expect(ctx!.totalAvailable).toBeGreaterThanOrEqual(ctx!.games.length);
  });

  it('resolves by base openingId from an opening name', () => {
    // Caro-Kann is a Naroditsky pilot opening.
    const ctx = loadPlayerGamesForLive({
      openingName: 'Caro-Kann Defense',
      moveHistory: [],
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.openingId).toContain('caro');
    expect(ctx!.games.every((g) => g.pgnPrefix.length > 0)).toBe(true);
  });

  it('never surfaces a game where the student side lost', () => {
    const ctx = loadPlayerGamesForLive({
      openingName: null,
      moveHistory: [],
      proOpeningId: SAMPLE.proOpeningId,
    });
    for (const g of ctx!.games) {
      const lost =
        (g.studentSide === 'white' && g.result === '0-1') ||
        (g.studentSide === 'black' && g.result === '1-0');
      expect(lost).toBe(false);
    }
  });

  it('ranks higher-rated opponents first', () => {
    const ctx = loadPlayerGamesForLive({
      openingName: null,
      moveHistory: [],
      proOpeningId: SAMPLE.proOpeningId,
    });
    const ratings = ctx!.games.map((g) => g.opponentRating ?? 0);
    const sorted = [...ratings].sort((a, b) => b - a);
    expect(ratings).toEqual(sorted);
  });
});
