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
  // The service now reads DEFAULT_RATING to decide the write-once anchor for a
  // coach-games reading. A mock that omits it throws at the call site — which
  // is the mock being wrong, not the code: partial module mocks have to keep up
  // with what the module under test actually imports.
  DEFAULT_RATING: 1200,
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
    // 🔴 THE CONTRACT CHANGED 2026-09-18, and these tests changed with it rather
    // than being annotated. What they used to assert — "no-ops when already
    // calibrated" and "asks for the picker for coach-games signal too (only
    // imports auto-calibrate)" — encoded the defect as intended behaviour: the
    // rating froze at first boot, and a student with no imports waited forever
    // on a picker that was deleted on 2026-09-02.

    it('re-estimates even when already calibrated — the freeze is gone', async () => {
      const profile = buildUserProfile({ id: 'main', strengthCalibrated: true, currentRating: 1234 });
      await db.profiles.put(profile);
      setEstimate({ rating: 1400, source: 'coach-games', sampleSize: 12 });

      const { result, profile: out } = await calibrateStrength(profile);

      expect(estimateMock, 'gating on strengthCalibrated froze the rating at first boot').toHaveBeenCalled();
      expect(result).toMatchObject({ calibrated: true, source: 'coach-games', rating: 1400 });
      expect(out.currentRating).toBe(1400);
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

      expect(result).toMatchObject({ calibrated: true, source: 'imported-games', rating: 1550 });
      expect(out.currentRating).toBe(1550);
      expect(out.puzzleRating).toBe(1550);
      const persisted = await db.profiles.get('main');
      expect(persisted?.puzzleRating).toBe(1550);
      expect(persisted?.strengthCalibrated).toBe(true);
    });

    it('APPLIES a coach-games estimate — a measurement is not a guess', async () => {
      // The running K=32 ELO over the student's own coach games was computed on
      // every boot and thrown away, so a student who never imported played the
      // default opponent for life while the app knew better.
      const profile = buildUserProfile({ id: 'main', currentRating: 800, strengthCalibrated: false });
      await db.profiles.put(profile);
      setEstimate({ rating: 1100, source: 'coach-games', sampleSize: 6 });

      const { result, profile: out } = await calibrateStrength(profile);

      expect(result).toMatchObject({ calibrated: true, source: 'coach-games', rating: 1100 });
      expect(out.currentRating).toBe(1100);
      expect((await db.profiles.get('main'))?.currentRating).toBe(1100);
    });

    it('writes NOTHING when the only signal is a GUESS (profile / default)', async () => {
      // The half of the 2026-09-02 rule that was always right and stays.
      const profile = buildUserProfile({ id: 'main', currentRating: 800, strengthCalibrated: false });
      await db.profiles.put(profile);
      setEstimate({ rating: 800, source: 'profile', sampleSize: 0 });

      const { result, profile: out } = await calibrateStrength(profile);

      expect(result).toMatchObject({ calibrated: false, source: 'no-signal' });
      expect(out).toBe(profile);
      expect((await db.profiles.get('main'))?.strengthCalibrated).toBe(false);
    });

    it('does not write when the measured rating has not moved', async () => {
      // ANCHORED profile: nothing left to establish, so an unchanged number is
      // a no-op. (The fixture gained `ratingBaseline` — without it the profile
      // is unanchored and the write below is REQUIRED; see the next test.)
      const profile = buildUserProfile({
        id: 'main', currentRating: 1100, ratingBaseline: 1200, strengthCalibrated: true,
      });
      await db.profiles.put(profile);
      setEstimate({ rating: 1100, source: 'coach-games', sampleSize: 9 });

      const { profile: out } = await calibrateStrength(profile);
      expect(out, 'a Dexie write per boot for an unchanged value is pure cost').toBe(profile);
    });

    it('DOES write an unanchored profile even when the number matches', async () => {
      // The anchor is what stops the estimate feeding on itself. If the
      // equality short-circuit ran before it landed, a profile whose first
      // reading happened to equal its stored rating would stay unanchored
      // forever and every later boot would re-derive from a moving field —
      // the drift, reintroduced through the one path that skips the write.
      const profile = buildUserProfile({ id: 'main', currentRating: 1100, strengthCalibrated: true });
      await db.profiles.put(profile);
      setEstimate({ rating: 1100, source: 'coach-games', sampleSize: 9 });

      const { profile: out } = await calibrateStrength(profile);
      expect(out.ratingBaseline).toBe(1200);
      expect(out.currentRating).toBe(1100);
    });

    it('anchors an IMPORTED reading at the imported rating, not the default', async () => {
      const profile = buildUserProfile({ id: 'main', currentRating: 800, strengthCalibrated: false });
      await db.profiles.put(profile);
      setEstimate({ rating: 1750, source: 'imported-games', sampleSize: 40 });

      const { profile: out } = await calibrateStrength(profile);
      expect(out.ratingBaseline).toBe(1750);
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
