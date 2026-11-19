import { describe, it, expect } from 'vitest';
import { checkAnswers } from './checkAnswers';
import { moveJob, MINE } from './bookMoveWhy';

// Danya have-check 2026-11-19: "it gives check" said on 23 boards — the check
// now says what it leaves them, or it stays the bare check its consumers drop.
describe('checkAnswers', () => {
  it('a back-rank check with one answer names it', () => {
    // Re8+ against the king on g8: h7 is its one flight square.
    expect(checkAnswers('4R1k1/5pp1/7p/8/8/8/8/6K1 b - - 0 1', 'their')).toBe('their only answer is Kh7');
  });
  it('the student in check reads "your"', () => {
    expect(checkAnswers('6k1/8/8/8/8/7P/5PP1/4r1K1 w - - 0 1', 'your')).toBe('your only answer is Kh2');
  });
  it('negative control: a check with many answers is no consequence', () => {
    expect(checkAnswers('rnbqkbnr/ppp2ppp/3p4/1B2p3/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 3', 'their')).toBeNull();
  });
  it('moveJob carries the answer on a bare check', () => {
    const j = moveJob('6k1/5pp1/7p/8/8/8/8/4R1K1 w - - 0 1', 'Re8+', 'w', MINE, null, []);
    expect(j?.clause).toBe('it gives check, and their only answer is Kh7');
  });
});
