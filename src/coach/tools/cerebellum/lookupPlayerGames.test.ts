import { describe, it, expect } from 'vitest';
import { lookupPlayerGamesTool } from './lookupPlayerGames';
import proGameReferencesData from '../../../data/pro-game-references.json';
import type { ProGameReference } from '../../../types';

const REFS = proGameReferencesData as unknown as ProGameReference[];
const SAMPLE = REFS[0];

describe('lookup_player_games tool', () => {
  it('is a read-only cerebellum tool', () => {
    expect(lookupPlayerGamesTool.name).toBe('lookup_player_games');
    expect(lookupPlayerGamesTool.category).toBe('cerebellum');
    expect(lookupPlayerGamesTool.kind).toBe('read');
  });

  it('returns games filtered by proOpeningId with full pgn by default', async () => {
    const r = await lookupPlayerGamesTool.execute({ proOpeningId: SAMPLE.proOpeningId });
    expect(r.ok).toBe(true);
    const result = r.result as { totalAvailable: number; games: Array<{ pgn: string; plyCount: number }> };
    expect(result.games.length).toBeGreaterThan(0);
    // full pgn => token count equals plyCount
    const g = result.games[0];
    expect(g.pgn.split(/\s+/).length).toBe(g.plyCount);
  });

  it('honors the limit (default 6, max 12)', async () => {
    const r = await lookupPlayerGamesTool.execute({ player: SAMPLE.playerId, limit: 2 });
    const result = r.result as { games: unknown[] };
    expect(result.games.length).toBeLessThanOrEqual(2);
  });

  it('resolves a player by display name', async () => {
    const r = await lookupPlayerGamesTool.execute({ player: 'Naroditsky', openingId: 'caro-kann' });
    const result = r.result as { totalAvailable: number };
    expect(result.totalAvailable).toBeGreaterThan(0);
  });

  it('returns empty (never invents) when nothing matches', async () => {
    const r = await lookupPlayerGamesTool.execute({ openingId: 'no-such-opening-xyz' });
    const result = r.result as { totalAvailable: number; games: unknown[] };
    expect(result.totalAvailable).toBe(0);
    expect(result.games).toEqual([]);
  });

  it('truncates to 40 plies when fullPgn is false', async () => {
    const r = await lookupPlayerGamesTool.execute({ proOpeningId: SAMPLE.proOpeningId, fullPgn: false });
    const result = r.result as { games: Array<{ pgn: string }> };
    for (const g of result.games) {
      expect(g.pgn.split(/\s+/).length).toBeLessThanOrEqual(40);
    }
  });
});
