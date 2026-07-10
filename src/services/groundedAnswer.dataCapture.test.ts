import { describe, it, expect } from 'vitest';
import { assembleTimeTroubleAnswer, assembleLastGameAnswer } from './groundedAnswer';

describe('assembleTimeTroubleAnswer', () => {
  it('returns null with no clocked games (caller serves no-data)', () => {
    expect(assembleTimeTroubleAnswer({ hits: 0, totalBlunders: 5, gamesWithClock: 0, lowestClockMs: null })).toBeNull();
  });
  it('reports no clock-driven errors when clocked but zero hits', () => {
    const a = assembleTimeTroubleAnswer({ hits: 0, totalBlunders: 8, gamesWithClock: 4, lowestClockMs: null });
    expect(a?.facts).toMatch(/aren't clock-driven/);
    expect(a?.sources).toContain('data:your-games');
  });
  it('quantifies the time-trouble share + lowest clock', () => {
    const a = assembleTimeTroubleAnswer({ hits: 3, totalBlunders: 12, gamesWithClock: 6, lowestClockMs: 8000 });
    expect(a?.facts).toMatch(/3 of your blunders/);
    expect(a?.facts).toMatch(/25%/);          // 3/12
    expect(a?.facts).toMatch(/8 seconds/);    // lowest clock
  });
});

describe('assembleLastGameAnswer', () => {
  it('returns null with no game', () => expect(assembleLastGameAnswer(null)).toBeNull());
  it('voices a win with opponent/opening/termination/length', () => {
    const a = assembleLastGameAnswer({ outcome: 'win', playerColor: 'white', opponent: 'iankane21', opening: 'Caro-Kann', endReason: 'resignation', movesPlayed: 34 });
    expect(a?.facts).toMatch(/you won as white against iankane21 in the Caro-Kann \(resignation\) after 34 moves/);
  });
  it('handles a bare draw', () => {
    const a = assembleLastGameAnswer({ outcome: 'draw', playerColor: 'black' });
    expect(a?.facts).toMatch(/you drew as black/);
  });
});
