import { describe, it, expect } from 'vitest';
import { coreRatingTier, explorerBandFor } from './ratingBands';
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
