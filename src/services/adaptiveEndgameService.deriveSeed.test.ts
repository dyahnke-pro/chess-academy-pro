import { describe, it, expect } from 'vitest';
import { deriveEndgameSeed, DEFAULT_ENDGAME_RATING } from './adaptiveEndgameService';

describe('deriveEndgameSeed', () => {
  it('prefers a persisted endgameRating when present', () => {
    expect(deriveEndgameSeed({ endgameRating: 1700, puzzleRating: 1200 })).toBe(1700);
  });

  it('falls back to puzzleRating for a newcomer (no endgameRating)', () => {
    expect(deriveEndgameSeed({ puzzleRating: 1850 })).toBe(1850);
  });

  it('falls back to currentRating when no puzzleRating', () => {
    expect(deriveEndgameSeed({ currentRating: 1600 })).toBe(1600);
  });

  it('nudges up/down by endgame skill', () => {
    // base 1500, endgame skill 100 → +200; skill 0 → -200.
    expect(deriveEndgameSeed({ puzzleRating: 1500, skillRadar: { endgame: 100 } })).toBe(1700);
    expect(deriveEndgameSeed({ puzzleRating: 1500, skillRadar: { endgame: 0 } })).toBe(1300);
  });

  it('defaults when nothing is known', () => {
    expect(deriveEndgameSeed(null)).toBe(DEFAULT_ENDGAME_RATING);
    expect(deriveEndgameSeed(undefined)).toBe(DEFAULT_ENDGAME_RATING);
  });
});
