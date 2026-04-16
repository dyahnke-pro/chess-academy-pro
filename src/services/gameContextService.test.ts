import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/schema';
import { fetchRelevantGames } from './gameContextService';
import { buildGameRecord } from '../test/factories';

vi.mock('./openingService', () => ({
  getRepertoireOpenings: vi.fn(),
}));

import { getRepertoireOpenings } from './openingService';

describe('fetchRelevantGames', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    vi.mocked(getRepertoireOpenings).mockReset();
    // Default repertoire — the Catalan and the Sicilian Najdorf.
    vi.mocked(getRepertoireOpenings).mockResolvedValue([
      { name: 'Catalan Opening', eco: 'E04' } as never,
      { name: 'Sicilian Najdorf', eco: 'B90' } as never,
      { name: 'Italian Game', eco: 'C50' } as never,
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty when no candidate games exist', async () => {
    const result = await fetchRelevantGames({ query: 'catalan' });
    expect(result.games).toEqual([]);
    expect(result.promptBlock).toBe('');
  });

  it('returns empty when the query names no known opening', async () => {
    await db.games.add(
      buildGameRecord({ id: 'g1', eco: 'E04', white: 'TestUser', black: 'Opp', result: '1-0' }),
    );
    const result = await fetchRelevantGames({ query: 'how do knights move' });
    expect(result.games).toEqual([]);
    expect(result.promptBlock).toBe('');
  });

  it('matches games by ECO when query names the opening', async () => {
    await db.games.bulkAdd([
      buildGameRecord({ id: 'g1', eco: 'E04', white: 'TestUser', black: 'Alice', result: '1-0', blackElo: 1650 }),
      buildGameRecord({ id: 'g2', eco: 'E04', white: 'Bob', black: 'TestUser', result: '1-0', whiteElo: 1700 }),
      buildGameRecord({ id: 'g3', eco: 'B90', white: 'TestUser', black: 'Carol', result: '1-0' }),
    ]);
    const result = await fetchRelevantGames({
      query: 'walk me through the catalan middlegame',
      username: 'TestUser',
    });
    expect(result.games.map((g) => g.gameId).sort()).toEqual(['g1', 'g2']);
    expect(result.promptBlock).toContain('GROUNDING');
    expect(result.promptBlock).toContain('E04');
  });

  it('matches games by bare ECO code in the query', async () => {
    await db.games.add(
      buildGameRecord({ id: 'g1', eco: 'B90', white: 'TestUser', black: 'Alice', result: '1-0' }),
    );
    const result = await fetchRelevantGames({ query: 'explain B90 for me', username: 'TestUser' });
    expect(result.games).toHaveLength(1);
    expect(result.games[0].gameId).toBe('g1');
  });

  it('labels result from the player\u2019s perspective', async () => {
    await db.games.bulkAdd([
      // User is black; white wins → LOSS for user.
      buildGameRecord({ id: 'g1', eco: 'E04', white: 'Bob', black: 'TestUser', result: '1-0' }),
      // User is white; white wins → WIN.
      buildGameRecord({ id: 'g2', eco: 'E04', white: 'TestUser', black: 'Alice', result: '1-0' }),
      // Draw stays draw.
      buildGameRecord({ id: 'g3', eco: 'E04', white: 'TestUser', black: 'Dave', result: '1/2-1/2' }),
    ]);
    const result = await fetchRelevantGames({
      query: 'catalan',
      username: 'TestUser',
    });
    const byId = Object.fromEntries(result.games.map((g) => [g.gameId, g]));
    expect(byId.g1.result).toBe('loss');
    expect(byId.g1.playerColor).toBe('black');
    expect(byId.g2.result).toBe('win');
    expect(byId.g2.playerColor).toBe('white');
    expect(byId.g3.result).toBe('draw');
  });

  it('excludes master games and unfinished games', async () => {
    await db.games.bulkAdd([
      buildGameRecord({ id: 'g1', eco: 'E04', white: 'TestUser', black: 'Alice', result: '1-0' }),
      buildGameRecord({ id: 'g2', eco: 'E04', white: 'Capablanca', black: 'Alekhine', result: '1-0', isMasterGame: true }),
      buildGameRecord({ id: 'g3', eco: 'E04', white: 'TestUser', black: 'Bob', result: '*' }),
    ]);
    const result = await fetchRelevantGames({ query: 'catalan', username: 'TestUser' });
    expect(result.games.map((g) => g.gameId)).toEqual(['g1']);
  });

  it('caps the number of returned games', async () => {
    const games = Array.from({ length: 10 }).map((_, i) =>
      buildGameRecord({
        id: `g${i}`,
        eco: 'E04',
        white: 'TestUser',
        black: `Opp${i}`,
        result: '1-0',
      }),
    );
    await db.games.bulkAdd(games);
    const result = await fetchRelevantGames({ query: 'catalan', username: 'TestUser', limit: 3 });
    expect(result.games).toHaveLength(3);
  });
});
