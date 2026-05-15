import { describe, it, expect, beforeEach } from 'vitest';
import {
  getKidRating,
  getAllKidRatings,
  bumpKidRating,
  resetKidRatings,
  DEFAULT_KID_RATING,
  MIN_KID_RATING,
  MAX_KID_RATING,
  RATING_GAIN_ON_CORRECT,
  RATING_LOSS_ON_INCORRECT,
} from './kidRatingService';
import { db } from '../db/schema';
import { buildUserProfile } from '../test/factories';

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

describe('kidRatingService', () => {
  describe('getKidRating', () => {
    it('returns default 100 when no profile', async () => {
      expect(await getKidRating('knight')).toBe(DEFAULT_KID_RATING);
    });

    it('returns default 100 when profile has no kidRatingByPiece', async () => {
      await db.profiles.put(buildUserProfile({ id: 'main' }));
      expect(await getKidRating('knight')).toBe(DEFAULT_KID_RATING);
    });

    it('returns persisted value when present', async () => {
      await db.profiles.put(
        buildUserProfile({ id: 'main', kidRatingByPiece: { knight: 450 } }),
      );
      expect(await getKidRating('knight')).toBe(450);
    });

    it('falls back per-piece when only some pieces are set', async () => {
      await db.profiles.put(
        buildUserProfile({ id: 'main', kidRatingByPiece: { rook: 200 } }),
      );
      expect(await getKidRating('rook')).toBe(200);
      expect(await getKidRating('bishop')).toBe(DEFAULT_KID_RATING);
    });
  });

  describe('bumpKidRating', () => {
    beforeEach(async () => {
      await db.profiles.put(buildUserProfile({ id: 'main' }));
    });

    it('adds +25 on correct', async () => {
      const next = await bumpKidRating('rook', true);
      expect(next).toBe(DEFAULT_KID_RATING + RATING_GAIN_ON_CORRECT);
    });

    it('subtracts 15 on incorrect', async () => {
      await db.profiles.put(
        buildUserProfile({ id: 'main', kidRatingByPiece: { rook: 500 } }),
      );
      const next = await bumpKidRating('rook', false);
      expect(next).toBe(500 - RATING_LOSS_ON_INCORRECT);
    });

    it('caps at floor 100 on a string of losses', async () => {
      const next = await bumpKidRating('rook', false);
      expect(next).toBe(MIN_KID_RATING);
    });

    it('caps at ceiling 2000', async () => {
      await db.profiles.put(
        buildUserProfile({ id: 'main', kidRatingByPiece: { rook: 1995 } }),
      );
      const next = await bumpKidRating('rook', true);
      expect(next).toBe(MAX_KID_RATING);
    });

    it('persists per-piece independence', async () => {
      await bumpKidRating('knight', true);
      await bumpKidRating('rook', false);
      expect(await getKidRating('knight')).toBe(DEFAULT_KID_RATING + RATING_GAIN_ON_CORRECT);
      expect(await getKidRating('rook')).toBe(MIN_KID_RATING);
      expect(await getKidRating('bishop')).toBe(DEFAULT_KID_RATING);
    });

    it('no-ops cleanly when no profile', async () => {
      await db.profiles.clear();
      const next = await bumpKidRating('rook', true);
      expect(next).toBe(DEFAULT_KID_RATING);
    });
  });

  describe('getAllKidRatings', () => {
    it('returns full 6-piece map with defaults for missing slots', async () => {
      await db.profiles.put(
        buildUserProfile({ id: 'main', kidRatingByPiece: { rook: 300, knight: 250 } }),
      );
      const all = await getAllKidRatings();
      expect(all).toEqual({
        king: DEFAULT_KID_RATING,
        queen: DEFAULT_KID_RATING,
        rook: 300,
        bishop: DEFAULT_KID_RATING,
        knight: 250,
        pawn: DEFAULT_KID_RATING,
      });
    });

    it('returns all defaults when no profile', async () => {
      const all = await getAllKidRatings();
      expect(Object.values(all)).toEqual(Array(6).fill(DEFAULT_KID_RATING));
    });
  });

  describe('resetKidRatings', () => {
    it('seeds every piece back to 100', async () => {
      await db.profiles.put(
        buildUserProfile({ id: 'main', kidRatingByPiece: { rook: 700, knight: 800 } }),
      );
      await resetKidRatings();
      const all = await getAllKidRatings();
      expect(Object.values(all)).toEqual(Array(6).fill(DEFAULT_KID_RATING));
    });
  });
});
