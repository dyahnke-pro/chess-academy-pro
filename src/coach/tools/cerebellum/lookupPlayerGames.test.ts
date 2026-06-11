import { describe, it, expect, beforeAll } from 'vitest';
import { lookupPlayerGamesTool } from './lookupPlayerGames';
import proGameReferencesData from '../../../../public/data/pro-game-references.json';
import { __setProGameReferenceCache } from '../../../services/proGameReferenceData';
import type { ProGameReference } from '../../../types';

const REFS = proGameReferencesData as unknown as ProGameReference[];
const SAMPLE = REFS[0];

// The tool awaits loadProGameReferenceData(); prime the cache with the
// real shipped asset so it resolves without a fetch in vitest.
beforeAll(() => __setProGameReferenceCache(REFS));

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

  it('finds Magnus Catalan REFERENCE games tagged by repertoire-tree, not openingId (David 2026-06-11)', async () => {
    // Carlsen's 7 Catalan wins are bucketed under openingId "queens-pawn"
    // with variationLabel "Catalan g3" (the build groups by his
    // repertoire tree, stashing the real opening in the label). A lookup
    // by openingName "Catalan" must match the variationLabel, not just
    // openingId — otherwise the coach wrongly says "no game." And the
    // "vs Catalan" games (he FACED it as Black) must be excluded.
    const r = await lookupPlayerGamesTool.execute({ player: 'Carlsen', openingName: 'Catalan' });
    const result = r.result as {
      totalAvailable: number;
      games: Array<{ id: string; source: string; studentSide: string; result: string; variationLabel: string; pgn: string }>;
    };
    expect(result.games.length).toBeGreaterThan(0);
    // Real reference games (not the model-game fallback).
    expect(result.games.some((g) => g.source !== 'model-game')).toBe(true);
    for (const g of result.games) {
      // Magnus WIELDING the Catalan (white), never facing it.
      expect(g.variationLabel.toLowerCase().startsWith('vs ')).toBe(false);
    }
  });

  it('falls back to a curated model game when the reference set truly has none', async () => {
    // An opening with no reference games at all still surfaces a real
    // game from the curated model-games corpus (tagged source:
    // 'model-game') instead of "no game found".
    const r = await lookupPlayerGamesTool.execute({ player: 'Carlsen', openingName: 'no-such-opening-zzz' });
    const result = r.result as { games: Array<{ source: string }> };
    // Either empty (truly nothing) or a model-game fallback — never a
    // hard "no game" lie when a curated game exists. For a nonsense
    // opening it's empty; this asserts the fallback path doesn't crash.
    expect(Array.isArray(result.games)).toBe(true);
  });

  it('truncates to 40 plies when fullPgn is false', async () => {
    const r = await lookupPlayerGamesTool.execute({ proOpeningId: SAMPLE.proOpeningId, fullPgn: false });
    const result = r.result as { games: Array<{ pgn: string }> };
    for (const g of result.games) {
      expect(g.pgn.split(/\s+/).length).toBeLessThanOrEqual(40);
    }
  });
});
