import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  getMiniGameProgress,
  saveMiniGameProgress,
  completeMiniGameLevel,
  isLevelUnlocked,
} from './miniGameService';
import type { MiniGameProgress } from '../types';

describe('miniGameService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('getMiniGameProgress', () => {
    it('returns null when no data exists', async () => {
      const result = await getMiniGameProgress('pawn-wars');
      expect(result).toBeNull();
    });
  });

  describe('saveMiniGameProgress', () => {
    it('persists and retrieves progress correctly', async () => {
      const progress: MiniGameProgress = {
        levels: {
          1: { completed: true, stars: 3, hintsUsed: 0 },
        },
      };

      await saveMiniGameProgress('pawn-wars', progress);
      const result = await getMiniGameProgress('pawn-wars');

      expect(result).toEqual(progress);
    });
  });

  describe('completeMiniGameLevel', () => {
    it('creates a new entry when no progress exists', async () => {
      const result = await completeMiniGameLevel('pawn-wars', 1, 2, 1);

      expect(result).toEqual({
        levels: {
          1: { completed: true, stars: 2, hintsUsed: 1 },
        },
      });

      const persisted = await getMiniGameProgress('pawn-wars');
      expect(persisted).toEqual(result);
    });

    it('initialises progress if none exists for the game', async () => {
      const result = await completeMiniGameLevel('blocker', 1, 1, 3);

      expect(result.levels[1]).toEqual({
        completed: true,
        stars: 1,
        hintsUsed: 3,
      });
    });

    it('keeps higher star count when replaying with fewer stars', async () => {
      await completeMiniGameLevel('pawn-wars', 1, 3, 0);
      const result = await completeMiniGameLevel('pawn-wars', 1, 1, 2);

      expect(result.levels[1]!.stars).toBe(3);
      expect(result.levels[1]!.hintsUsed).toBe(2);
    });

    it('updates to higher star count when replaying with more stars', async () => {
      await completeMiniGameLevel('pawn-wars', 1, 1, 2);
      const result = await completeMiniGameLevel('pawn-wars', 1, 3, 0);

      expect(result.levels[1]!.stars).toBe(3);
      expect(result.levels[1]!.hintsUsed).toBe(0);
    });

    it('preserves other levels when completing a new level', async () => {
      await completeMiniGameLevel('pawn-wars', 1, 3, 0);
      const result = await completeMiniGameLevel('pawn-wars', 2, 2, 1);

      expect(result.levels[1]).toEqual({
        completed: true,
        stars: 3,
        hintsUsed: 0,
      });
      expect(result.levels[2]).toEqual({
        completed: true,
        stars: 2,
        hintsUsed: 1,
      });
    });
  });

  describe('isLevelUnlocked', () => {
    it('level 1 is always unlocked with valid progress', () => {
      const progress: MiniGameProgress = { levels: {} };
      expect(isLevelUnlocked(progress, 1)).toBe(true);
    });

    it('level 1 is always unlocked with null progress', () => {
      expect(isLevelUnlocked(null, 1)).toBe(true);
    });

    it('level 2 is locked when level 1 is not completed', () => {
      const progress: MiniGameProgress = { levels: {} };
      expect(isLevelUnlocked(progress, 2)).toBe(false);
    });

    it('level 2 is unlocked when level 1 is completed', () => {
      const progress: MiniGameProgress = {
        levels: {
          1: { completed: true, stars: 2, hintsUsed: 0 },
        },
      };
      expect(isLevelUnlocked(progress, 2)).toBe(true);
    });

    it('level 3 is locked without level 2 completed even if level 1 is complete', () => {
      const progress: MiniGameProgress = {
        levels: {
          1: { completed: true, stars: 3, hintsUsed: 0 },
        },
      };
      expect(isLevelUnlocked(progress, 3)).toBe(false);
    });

    it('returns only level 1 as unlocked when progress is null', () => {
      expect(isLevelUnlocked(null, 1)).toBe(true);
      expect(isLevelUnlocked(null, 2)).toBe(false);
      expect(isLevelUnlocked(null, 3)).toBe(false);
    });
  });

  describe('cross-game isolation', () => {
    it('two different gameIds have separate progress', async () => {
      await completeMiniGameLevel('pawn-wars', 1, 3, 0);
      await completeMiniGameLevel('blocker', 1, 1, 2);

      const pawnWars = await getMiniGameProgress('pawn-wars');
      const blocker = await getMiniGameProgress('blocker');

      expect(pawnWars!.levels[1]!.stars).toBe(3);
      expect(pawnWars!.levels[1]!.hintsUsed).toBe(0);

      expect(blocker!.levels[1]!.stars).toBe(1);
      expect(blocker!.levels[1]!.hintsUsed).toBe(2);
    });
  });
});
