import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildUserProfile } from '../test/factories';
import {
  SKILL_BANDS,
  clampRating,
  applyStrength,
  calibrateStrength,
} from './strengthCalibrationService';
import type { RatingEstimate } from './playerRatingService';

const estimateMock = vi.hoisted(() => vi.fn());
vi.mock('./playerRatingService', () => ({
  getPlayerRatingEstimate: estimateMock,
}));

function setEstimate(e: RatingEstimate): void {
  estimateMock.mockResolvedValue(e);
}

describe('strengthCalibrationService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    estimateMock.mockReset();
  });

  describe('clampRating', () => {
    it('clamps below the floor and above the ceiling', () => {
      expect(clampRating(100)).toBe(400);
      expect(clampRating(5000)).toBe(2800);
      expect(clampRating(1234)).toBe(1234);
    });
    it('falls back to the beginner band for non-finite input', () => {
      expect(clampRating(NaN)).toBe(SKILL_BANDS[1].rating);
    });
  });

  describe('applyStrength', () => {
    it('writes BOTH currentRating and puzzleRating and marks calibrated', async () => {
      const profile = buildUserProfile({
        id: 'main',
        currentRating: 1400,
        puzzleRating: 1400,
        strengthCalibrated: false,
      });
      await db.profiles.put(profile);

      const updated = await applyStrength(profile, 600);

      expect(updated.currentRating).toBe(600);
      expect(updated.puzzleRating).toBe(600);
      expect(updated.strengthCalibrated).toBe(true);

      const persisted = await db.profiles.get('main');
      expect(persisted?.currentRating).toBe(600);
      expect(persisted?.puzzleRating).toBe(600);
      expect(persisted?.strengthCalibrated).toBe(true);
    });

    it('clamps the applied rating', async () => {
      const profile = buildUserProfile({ id: 'main' });
      await db.profiles.put(profile);
      const updated = await applyStrength(profile, 50);
      expect(updated.puzzleRating).toBe(400);
    });
  });

  describe('calibrateStrength', () => {
    it('no-ops when already calibrated', async () => {
      const profile = buildUserProfile({ id: 'main', strengthCalibrated: true, currentRating: 1234 });
      const { result } = await calibrateStrength(profile);
      expect(result).toEqual({ calibrated: true, needsPicker: false, rating: 1234, source: 'already' });
      expect(estimateMock).not.toHaveBeenCalled();
    });

    it('seeds BOTH ratings silently from imported games', async () => {
      const profile = buildUserProfile({
        id: 'main',
        currentRating: 800,
        puzzleRating: 800,
        strengthCalibrated: false,
      });
      await db.profiles.put(profile);
      setEstimate({ rating: 1550, source: 'imported-games', sampleSize: 20 });

      const { result, profile: out } = await calibrateStrength(profile);

      expect(result).toMatchObject({ calibrated: true, needsPicker: false, source: 'imported-games', rating: 1550 });
      expect(out.currentRating).toBe(1550);
      expect(out.puzzleRating).toBe(1550);
      const persisted = await db.profiles.get('main');
      expect(persisted?.puzzleRating).toBe(1550);
      expect(persisted?.strengthCalibrated).toBe(true);
    });

    it('asks for the picker when the only signal is the profile/default (no imports)', async () => {
      const profile = buildUserProfile({ id: 'main', strengthCalibrated: false });
      await db.profiles.put(profile);
      setEstimate({ rating: 800, source: 'profile', sampleSize: 0 });

      const { result } = await calibrateStrength(profile);
      expect(result).toEqual({ calibrated: false, needsPicker: true });

      const persisted = await db.profiles.get('main');
      expect(persisted?.strengthCalibrated).toBe(false);
    });

    it('asks for the picker for coach-games signal too (only imports auto-calibrate)', async () => {
      const profile = buildUserProfile({ id: 'main', strengthCalibrated: false });
      await db.profiles.put(profile);
      setEstimate({ rating: 1100, source: 'coach-games', sampleSize: 6 });

      const { result } = await calibrateStrength(profile);
      expect(result.needsPicker).toBe(true);
    });
  });

  describe('SKILL_BANDS', () => {
    it('is ordered weakest → strongest with sane ratings', () => {
      const ratings = SKILL_BANDS.map((b) => b.rating);
      expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
      for (const r of ratings) {
        expect(clampRating(r)).toBe(r);
      }
    });
  });
});
