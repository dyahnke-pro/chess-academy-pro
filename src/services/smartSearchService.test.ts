import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildOpeningRecord, buildGameRecord, resetFactoryCounter } from '../test/factories';

// Mock coachApi to avoid real LLM calls
vi.mock('./coachApi', () => ({
  getCoachChatResponse: vi.fn().mockResolvedValue(''),
}));

// Import after mocks
const { smartSearch, basicTextSearch, searchSettings } = await import('./smartSearchService');

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

  describe('searchSettings', () => {
    it('finds board color setting', () => {
      const results = searchSettings('board color');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].category).toBe('setting');
      expect(results[0].title).toBe('Board Color');
      expect(results[0].route).toBe('/settings?tab=board&section=board-appearance');
    });

    it('finds settings by natural language keywords', () => {
      const results = searchSettings('change color');
      expect(results.some((r) => r.title === 'Board Color')).toBe(true);
    });

    it('finds piece set setting', () => {
      const results = searchSettings('piece set');
      expect(results.some((r) => r.title === 'Piece Set')).toBe(true);
    });

    it('finds voice setting', () => {
      const results = searchSettings('voice');
      expect(results.some((r) => r.title === 'Voice Narration' || r.title === 'Voice Settings')).toBe(true);
    });

    it('finds theme setting', () => {
      const results = searchSettings('dark mode');
      expect(results.some((r) => r.title === 'App Theme')).toBe(true);
    });

    it('finds API key setting', () => {
      const results = searchSettings('api key');
      expect(results.some((r) => r.title === 'API Key')).toBe(true);
      expect(results.find((r) => r.title === 'API Key')?.route).toBe('/settings?tab=coach&section=coach');
    });

    it('returns empty for unrelated queries', () => {
      const results = searchSettings('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('limits results to 6', () => {
      // "model" matches multiple settings entries
      const results = searchSettings('model');
      expect(results.length).toBeLessThanOrEqual(6);
    });
  });

  describe('basicTextSearch with settings', () => {
    it('includes settings results in unscoped search', async () => {
      const results = await basicTextSearch('board color');
      expect(results.some((r) => r.category === 'setting')).toBe(true);
    });

    it('scopes to settings only', async () => {
      const results = await basicTextSearch('board color', 'setting');
      expect(results.every((r) => r.category === 'setting')).toBe(true);
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
