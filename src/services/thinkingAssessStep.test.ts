import { describe, it, expect } from 'vitest';
import { assessKey, assessKit, kingInDanger } from './thinkingAssessStep';

// White's king is still on e1 with the d- and e-files open; Black is castled
// behind three pawns, and Black still has a queen.
const OPEN_KING = 'rnbq1rk1/ppp2ppp/3b1n2/8/8/8/PPP2PPP/RNBQKB1R w KQ - 0 1';
// The same kings with the queens off: an exposed king in an ending is not in danger.
const NO_QUEENS = 'rnb2rk1/ppp2ppp/3b1n2/8/8/8/PPP2PPP/RNB1KB1R w KQ - 0 1';
// Both castled behind full shields.
const BOTH_SAFE = 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 1';

describe('assess — whose king is in more danger', () => {
  it('keys the one exposed king, from the one king-safety computer', () => {
    expect(assessKey(OPEN_KING)?.key).toEqual(['e1']);
    expect(kingInDanger(OPEN_KING)?.color).toBe('w');
  });

  it('is not asked when no queen faces the exposed king', () => {
    expect(assessKey(NO_QUEENS)).toBeNull();
  });

  it('is not asked when both kings are safe (nothing to compare)', () => {
    expect(assessKey(BOTH_SAFE)).toBeNull();
  });

  it('says why, from the student\'s seat, and never names the king on a wrong tap', () => {
    const kit = assessKit();
    expect(kit.reasonFor(OPEN_KING, 'e1')).toMatch(/^Your king on e1: it is still in the centre/);
    expect(kit.showLine(OPEN_KING, ['e1'], 0)).toMatch(/They are up 3 points of material/);
    expect(kit.wrongTapLine(OPEN_KING, 'g8')).not.toMatch(/e1/);
    expect(kit.wrongTapLine(OPEN_KING, 'a2')).toMatch(/Tap a king/);
  });
});
