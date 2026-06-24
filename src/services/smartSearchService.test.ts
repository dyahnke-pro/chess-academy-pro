import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildOpeningRecord, buildGameRecord, resetFactoryCounter } from '../test/factories';

// Mock coachApi to avoid real LLM calls
vi.mock('./coachApi', () => ({
  getCoachChatResponse: vi.fn().mockResolvedValue(''),
}));

// Import after mocks
const { smartSearch, basicTextSearch } = await import('./smartSearchService');

describe('smartSearchService', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
  });

  describe('basicTextSearch', () => {
    it('finds openings by name', async () => {
      await db.openings.bulkAdd([
        buildOpeningRecord({ id: 'sicilian-1', name: 'Sicilian Defense', eco: 'B20', isRepertoire: true }),
        buildOpeningRecord({ id: 'french-1', name: 'French Defense', eco: 'C00', isRepertoire: true }),
      ]);

      const results = await basicTextSearch('sicilian');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Sicilian');
      expect(results[0].category).toBe('opening');
    });

    it('finds openings by ECO code', async () => {
      await db.openings.add(
        buildOpeningRecord({ id: 'eco-test', name: 'Ruy Lopez', eco: 'C60', isRepertoire: true }),
      );

      const results = await basicTextSearch('C60');
      expect(results.some((r) => r.title.includes('Ruy Lopez'))).toBe(true);
    });

    it('surfaces a pro repertoire entry distinctly from the masterclass one', async () => {
      // Both the masterclass and GothamChess pro repertoire are named "Vienna
      // Game" and share the openings store — searching "Vienna" returns both.
      // The pro entry must be labeled (so they aren't indistinguishable) and
      // routed to the pro path (so it opens in its pro context).
      await db.openings.bulkAdd([
        buildOpeningRecord({ id: 'vienna-game', name: 'Vienna Game', eco: 'C25', color: 'white' }),
        buildOpeningRecord({ id: 'pro-gothamchess-vienna', name: 'Vienna Game', eco: 'C25', color: 'white', proPlayerId: 'gothamchess' }),
      ]);

      const results = await basicTextSearch('Vienna');
      const master = results.find((r) => r.id === 'vienna-game');
      const pro = results.find((r) => r.id === 'pro-gothamchess-vienna');

      expect(master).toBeDefined();
      expect(pro).toBeDefined();
      // Pro entry routes to the pro path, not the generic /openings/:id.
      expect(pro?.route).toBe('/openings/pro/gothamchess/pro-gothamchess-vienna');
      expect(master?.route).toBe('/openings/vienna-game');
      // Pro entry is labeled so it's distinguishable in the dropdown.
      expect(pro?.subtitle.startsWith('Pro ·')).toBe(true);
      expect(master?.subtitle.startsWith('Pro ·')).toBe(false);
    });

    it('finds games by player name', async () => {
      await db.games.add(
        buildGameRecord({ id: 'game-1', white: 'Magnus', black: 'Hikaru', result: '1-0', date: '2024-01-01' }),
      );

      const results = await basicTextSearch('Magnus');
      expect(results.some((r) => r.category === 'game')).toBe(true);
      expect(results.some((r) => r.title.includes('Magnus'))).toBe(true);
    });

    it('returns empty array for empty query', async () => {
      const results = await basicTextSearch('');
      expect(results).toEqual([]);
    });

    it('scopes results to specified category', async () => {
      await db.openings.add(
        buildOpeningRecord({ id: 'scoped', name: 'Test Opening', eco: 'A00' }),
      );
      await db.games.add(
        buildGameRecord({ id: 'scoped-game', white: 'Test', black: 'Player' }),
      );

      const openingOnly = await basicTextSearch('Test', 'opening');
      expect(openingOnly.every((r) => r.category === 'opening')).toBe(true);
    });
  });

  describe('smartSearch', () => {
    it('uses basic search for short queries', async () => {
      await db.openings.add(
        buildOpeningRecord({ id: 'short-q', name: 'Sicilian Defense', eco: 'B20' }),
      );

      const results = await smartSearch('Sicilian');
      expect(results.some((r) => r.title.includes('Sicilian'))).toBe(true);
    });

    it('uses basic search for ECO code patterns', async () => {
      await db.openings.add(
        buildOpeningRecord({ id: 'eco-q', name: 'Test Opening', eco: 'B01' }),
      );

      const results = await smartSearch('B01');
      expect(results.some((r) => r.subtitle.includes('B01'))).toBe(true);
    });

    it('returns empty for empty query', async () => {
      const results = await smartSearch('');
      expect(results).toEqual([]);
    });

    it('falls back to basic search when LLM returns empty for longer queries', async () => {
      await db.openings.add(
        buildOpeningRecord({ id: 'fallback', name: 'French Defense', eco: 'C00' }),
      );

      // 3-word query triggers LLM path, mock returns empty → falls back to basic
      // Basic search with "French Defense openings" won't substring-match, so expect empty
      const results = await smartSearch('French Defense openings');
      // The fallback searches the full phrase — this tests that it doesn't crash
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
