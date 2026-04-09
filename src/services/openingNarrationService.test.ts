import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  getBestNarration,
  shouldUseClaudeFallback,
  pickNarration,
  seedNarrations,
} from './openingNarrationService';
import type { OpeningNarration } from '../types';

const FEN_AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

const ITALIAN_E4: OpeningNarration = {
  id: 'test-italian-e4',
  openingName: 'Italian Game',
  variation: '',
  moveSan: 'e4',
  fen: FEN_AFTER_E4,
  narrations: [
    'First narration for e4 in Italian Game.',
    'Second narration for e4 in Italian Game.',
  ],
  approved: true,
};

const SICILIAN_C5: OpeningNarration = {
  id: 'test-sicilian-c5',
  openingName: 'Sicilian Defense',
  variation: 'Najdorf',
  moveSan: 'c5',
  fen: null,
  narrations: ['Sicilian c5 narration.'],
  approved: true,
};

const UNAPPROVED: OpeningNarration = {
  id: 'test-unapproved',
  openingName: 'Test Opening',
  variation: '',
  moveSan: 'Nf3',
  fen: null,
  narrations: ['Should not be returned.'],
  approved: false,
};

describe('openingNarrationService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('getBestNarration', () => {
    it('returns null when no moves provided', async () => {
      const result = await getBestNarration(FEN_AFTER_E4, []);
      expect(result).toBeNull();
    });

    it('returns null when DB is empty', async () => {
      const result = await getBestNarration(FEN_AFTER_E4, ['e4'], 'Italian Game');
      expect(result).toBeNull();
    });

    it('matches by FEN (highest priority)', async () => {
      await seedNarrations([ITALIAN_E4, SICILIAN_C5]);
      const result = await getBestNarration(FEN_AFTER_E4, ['e4'], 'Italian Game');
      expect(result).not.toBeNull();
      expect(result!.matchType).toBe('fen');
      expect(result!.narration.id).toBe('test-italian-e4');
    });

    it('matches by opening name + move SAN when FEN not found', async () => {
      await seedNarrations([SICILIAN_C5]);
      const result = await getBestNarration(
        'some-other-fen',
        ['e4', 'c5'],
        'Sicilian Defense',
      );
      expect(result).not.toBeNull();
      expect(result!.matchType).toBe('opening_move');
      expect(result!.narration.id).toBe('test-sicilian-c5');
    });

    it('falls back to move-only match as last resort', async () => {
      await seedNarrations([SICILIAN_C5]);
      const result = await getBestNarration('some-fen', ['c5']);
      expect(result).not.toBeNull();
      expect(result!.matchType).toBe('move_only');
    });

    it('skips unapproved narrations', async () => {
      await seedNarrations([UNAPPROVED]);
      const result = await getBestNarration('some-fen', ['Nf3'], 'Test Opening');
      expect(result).toBeNull();
    });

    it('prefers variation-specific match over generic', async () => {
      const generic: OpeningNarration = {
        id: 'test-sicilian-generic',
        openingName: 'Sicilian Defense',
        variation: '',
        moveSan: 'c5',
        fen: null,
        narrations: ['Generic narration.'],
        approved: true,
      };
      await seedNarrations([generic, SICILIAN_C5]);
      const result = await getBestNarration(
        'some-fen',
        ['e4', 'c5'],
        'Sicilian Defense',
      );
      expect(result).not.toBeNull();
      expect(result!.narration.variation).toBe('Najdorf');
    });
  });

  describe('shouldUseClaudeFallback', () => {
    it('returns true when match is null', () => {
      expect(shouldUseClaudeFallback(null)).toBe(true);
    });

    it('returns true for move_only matches', () => {
      expect(shouldUseClaudeFallback({
        narration: SICILIAN_C5,
        matchType: 'move_only',
      })).toBe(true);
    });

    it('returns true for unapproved narrations', () => {
      expect(shouldUseClaudeFallback({
        narration: UNAPPROVED,
        matchType: 'opening_move',
      })).toBe(true);
    });

    it('returns true when narrations array is empty', () => {
      const empty: OpeningNarration = { ...ITALIAN_E4, narrations: [] };
      expect(shouldUseClaudeFallback({
        narration: empty,
        matchType: 'fen',
      })).toBe(true);
    });

    it('returns false for FEN match with approved narration', () => {
      expect(shouldUseClaudeFallback({
        narration: ITALIAN_E4,
        matchType: 'fen',
      })).toBe(false);
    });

    it('returns false for opening_move match with approved narration', () => {
      expect(shouldUseClaudeFallback({
        narration: SICILIAN_C5,
        matchType: 'opening_move',
      })).toBe(false);
    });
  });

  describe('pickNarration', () => {
    it('returns empty string for empty narrations', () => {
      const empty: OpeningNarration = { ...ITALIAN_E4, narrations: [] };
      expect(pickNarration(empty)).toBe('');
    });

    it('returns the only narration when there is one', () => {
      expect(pickNarration(SICILIAN_C5)).toBe('Sicilian c5 narration.');
    });

    it('returns a narration from the array when there are multiple', () => {
      const result = pickNarration(ITALIAN_E4);
      expect(ITALIAN_E4.narrations).toContain(result);
    });
  });

  describe('seedNarrations', () => {
    it('inserts narrations into the database', async () => {
      await seedNarrations([ITALIAN_E4, SICILIAN_C5]);
      const count = await db.openingNarrations.count();
      expect(count).toBe(2);
    });

    it('is idempotent (bulkPut overwrites)', async () => {
      await seedNarrations([ITALIAN_E4]);
      await seedNarrations([ITALIAN_E4]);
      const count = await db.openingNarrations.count();
      expect(count).toBe(1);
    });
  });
});
