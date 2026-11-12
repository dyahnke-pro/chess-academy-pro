// THE MOVE "PLAYERS REACH FOR" IS PLAYED IN REAL NUMBERS (task 172,
// 2026-11-11). `refutedFromFan` said "Most people play …Nbd7 here — it shows
// up in plenty of games" of a move played 3 times in 22 games (14%): the share
// cleared the bar and nothing read the count behind it. Fails on the code
// before the fix (`pickAlternative` took any share of any sample).
import { describe, it, expect } from 'vitest';
import { pickAlternative } from './refutedAlternativeCore';

describe('the move players reach for is played in real numbers', () => {
  it('three games are not "plenty of games" (14% of 22)', () => {
    expect(pickAlternative('Bg7', [{ san: 'Bg7', games: 15, pct: 68 }, { san: 'Nbd7', games: 3, pct: 14 }])).toBeNull();
  });

  it('the same share over a real sample is an alternative', () => {
    expect(pickAlternative('Bg7', [{ san: 'Bg7', games: 150, pct: 68 }, { san: 'Nbd7', games: 30, pct: 14 }])?.san).toBe('Nbd7');
  });
});
