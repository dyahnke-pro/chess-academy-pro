// THE IN-BETWEEN MOVE, ONE DETECTOR, BOTH DIRECTIONS (A-plan P7): what Learn
// teaches as "not yet — first this", the tactic record files as zwischenzug.
import { describe, it, expect } from 'vitest';
import { inBetweenMove } from './inBetweenMove';
import { detectTacticType } from './missedTacticService';
import { notYet } from './thinkAloud';

// Bxd5 is on the board; Re8+ first, Kh7, and the knight is still there to take.
const FEN = '6k1/5pp1/7p/3n4/8/1B6/5PPP/4R1K1 w - - 0 1';
const PV = ['e1e8', 'g8h7', 'b3d5'];

describe('the in-between move', () => {
  it('is found: a check first, the capture still there after the reply', () => {
    expect(inBetweenMove(FEN, PV)).toEqual({ capture: 'Bxd5', captureSquare: 'd5', first: 'Re8+', check: true });
  });
  it('Learn teaches it ("not yet — first …")', () => {
    expect(notYet(FEN, { san: 'Re8+', pv: PV, cp: 300 })?.text).toMatch(/^The capture on d5 is not going anywhere\. Not yet — first .* with check, and take after\.$/);
  });
  it('the record files a missed one as zwischenzug, not the unnamed sentinel', () => {
    expect(detectTacticType(FEN, 'e1e8', PV)).toBe('zwischenzug');
  });
  it('NEGATIVE: a plain capture first is not an in-between move', () => {
    expect(inBetweenMove(FEN, ['b3d5', 'g8h7', 'e1e8'])).toBeNull();
  });
});
