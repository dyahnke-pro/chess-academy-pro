import { describe, it, expect } from 'vitest';
import {
  coreRatingTier, explorerBandFor, ADAPTIVE_DECIDERS, type AdaptiveDeciderId,
} from './ratingBands';
import { pvBandForRating } from './mistakePuzzleService';
import { getTacticLookahead } from './tacticAlertService';
import { alertSensitivityMultiplier, hintStartTier, wrongTriesBeforeHint } from './skillScaling';
import { causalChainDepth } from './causalChainVoice';
import { ratingBandFor as amateurBand } from './amateurPlayCache';
import { ratingBandFor as theoryBand } from './theoryDeparture';
import { explorerBandForElo } from './coachGameEngine';

describe('coreRatingTier — the single teaching taxonomy', () => {
  it('bands at <1000 / 1000–2000 / >2000', () => {
    expect(coreRatingTier(600)).toBe('beginner');
    expect(coreRatingTier(999)).toBe('beginner');
    expect(coreRatingTier(1000)).toBe('intermediate');
    expect(coreRatingTier(1500)).toBe('intermediate');
    expect(coreRatingTier(2000)).toBe('intermediate');
    expect(coreRatingTier(2001)).toBe('advanced');
    expect(coreRatingTier(2400)).toBe('advanced');
  });

  it('defaults an unknown rating to intermediate (1200)', () => {
    expect(coreRatingTier(undefined)).toBe('intermediate');
    expect(coreRatingTier(null)).toBe('intermediate');
  });
});

describe('explorerBandFor — ONE explorer band for every surface', () => {
  // The band decides WHOSE games we quote back as "what people at your level
  // play". Three pickers over two bucket lists used to disagree, so the same
  // student heard about two different populations depending on the surface.
  it('always CONTAINS the student rating inside the bucket range', () => {
    for (let r = 1000; r <= 2500; r += 50) {
      const [lo, hi] = explorerBandFor(r).band.split(',').map(Number);
      expect(r, `rating ${r} fell outside its own band`).toBeGreaterThanOrEqual(lo);
      expect(r, `rating ${r} fell outside its own band`).toBeLessThanOrEqual(hi);
    }
  });

  it('always returns a PAIR — never a lone bucket', () => {
    for (let r = 600; r <= 3000; r += 50) {
      expect(explorerBandFor(r).band.split(',')).toHaveLength(2);
    }
  });

  it('fixes the two measured disagreements', () => {
    // theoryDeparture's ladder quoted 1400–1600 games to a 1300 player...
    expect(explorerBandFor(1300).band).toBe('1200,1400');
    // ...and 1600–1800 games to a 1900 player.
    expect(explorerBandFor(1900).band).toBe('1800,2000');
    // amateurPlayCache's list stopped at 2200, so its top band was a lone bucket.
    expect(explorerBandFor(2400).band).toBe('2200,2500');
  });

  it('every consumer delegates — no surface may pick its own band', () => {
    for (const r of [900, 1200, 1300, 1500, 1750, 1900, 2100, 2400]) {
      const want = explorerBandFor(r).band;
      expect(amateurBand(r).band, `amateurPlayCache drifted at ${r}`).toBe(want);
      expect(theoryBand(r), `theoryDeparture drifted at ${r}`).toBe(want);
      expect(explorerBandForElo(r), `coachGameEngine drifted at ${r}`).toBe(want);
    }
  });

  it('an unknown rating falls to the same 1200 prior as coreRatingTier', () => {
    expect(explorerBandFor(undefined).band).toBe(explorerBandFor(1200).band);
    expect(explorerBandFor(null).band).toBe(explorerBandFor(1200).band);
    expect(explorerBandFor(Number.NaN).band).toBe(explorerBandFor(1200).band);
  });
});

describe('ADAPTIVE_DECIDERS — two kinds, and the code must match the declaration', () => {
  // The registry is only worth having if it is CHECKED. Each decider is probed
  // at three ratings and its declared slope proved against what it actually
  // returns — so a curve that gets rewritten without updating its entry (or an
  // entry written from the comment rather than the code) fails the build.
  const LOW = 900, MID = 1600, HIGH = 2300;
  const DEPTH_RANK: Record<string, number> = { tight: 1, medium: 2, full: 3 };

  const probes: Record<AdaptiveDeciderId, (r: number) => number> = {
    pvBandForRating: (r) => pvBandForRating(r).max,
    getTacticLookahead: (r) => getTacticLookahead(r),
    alertSensitivityMultiplier: (r) => alertSensitivityMultiplier(r),
    causalChainDepth: (r) => DEPTH_RANK[causalChainDepth(r)],
    hintStartTier: (r) => hintStartTier(r),
    wrongTriesBeforeHint: (r) => wrongTriesBeforeHint(r),
  };

  it('every declared slope is what the code actually does', () => {
    for (const [id, decl] of Object.entries(ADAPTIVE_DECIDERS)) {
      const p = probes[id as AdaptiveDeciderId];
      const [lo, mid, hi] = [p(LOW), p(MID), p(HIGH)];
      const msg = `${id} is declared to ${decl.slope} with rating — it returns ${lo} / ${mid} / ${hi} at ${LOW} / ${MID} / ${HIGH}`;
      if (decl.slope === 'rises') expect(hi, msg).toBeGreaterThan(lo);
      else expect(hi, msg).toBeLessThan(lo);
      // monotone, never a bump in the middle
      if (decl.slope === 'rises') expect(mid, `${msg} — non-monotone`).toBeGreaterThanOrEqual(lo);
      else expect(mid, `${msg} — non-monotone`).toBeLessThanOrEqual(lo);
    }
  });

  it('has an entry for every decider — the registry cannot go stale silently', () => {
    expect(Object.keys(ADAPTIVE_DECIDERS).sort()).toEqual(Object.keys(probes).sort());
    // Six since B6 (2026-09-22): `criticalityThresholds` left the registry
    // because it is band-free now — a bar the rating scaled was the rating
    // deciding volume, which the FOUNDATION forbids.
    expect(Object.keys(ADAPTIVE_DECIDERS).length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(ADAPTIVE_DECIDERS)).not.toContain('criticalityThresholds');
  });

  it('the two kinds genuinely disagree — this is not a distinction without a difference', () => {
    const kinds = new Set(Object.values(ADAPTIVE_DECIDERS).map((d) => d.kind));
    expect(kinds, 'both kinds must be populated or the doctrine is vacuous').toEqual(new Set(['capacity', 'support']));
    // The point of the split: two deciders can answer questions about the same
    // student and correctly move in opposite directions. If every decider ever
    // agreed, the registry would be ceremony.
    const slopes = new Set(Object.values(ADAPTIVE_DECIDERS).map((d) => d.slope));
    expect(slopes.size, 'no decider disagrees with another — re-check the probes').toBe(2);
  });
});
