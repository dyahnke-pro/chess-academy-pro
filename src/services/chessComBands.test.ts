import { describe, it, expect } from 'vitest';
import { winPctLost, bandForWinPctLost, winPercent } from './accuracyService';
import { INACCURACY_WIN_PCT, MISTAKE_WIN_PCT, BLUNDER_WIN_PCT } from './engineConstants';

/**
 * MATCH CHESS.COM (David 2026-09-20: "remove the rot and match chess.com",
 * "do that for blunders and inaccuracies as well").
 *
 * chess.com bands on EXPECTED POINTS LOST, not centipawns:
 *   inaccuracy 0.05–0.10 · mistake 0.10–0.20 · blunder 0.20–1.00
 * which is the 5 / 10 / 20 win-percentage points asserted here.
 * Source: https://support.chess.com/en/articles/8572705
 */
describe('chess.com bands — the table itself', () => {
  it("uses chess.com's published cut points, in win-percentage points", () => {
    expect([INACCURACY_WIN_PCT, MISTAKE_WIN_PCT, BLUNDER_WIN_PCT]).toEqual([5, 10, 20]);
  });

  it('bands each tier at its boundary, inclusive', () => {
    expect(bandForWinPctLost(20)).toBe('blunder');
    expect(bandForWinPctLost(19.99)).toBe('mistake');
    expect(bandForWinPctLost(10)).toBe('mistake');
    expect(bandForWinPctLost(9.99)).toBe('inaccuracy');
    expect(bandForWinPctLost(5)).toBe('inaccuracy');
  });

  it('returns null below an inaccuracy — a verdict, not a gap', () => {
    expect(bandForWinPctLost(4.99)).toBeNull();
    expect(bandForWinPctLost(0)).toBeNull();
    expect(bandForWinPctLost(-30)).toBeNull(); // a move that GAINED
  });
});

describe('THE POINT OF THE CURRENCY — the same centipawns, different verdicts', () => {
  it('300cp handed back while winning is an INACCURACY, not a blunder', () => {
    // +9.00 → +6.00. The raw-centipawn band called this a blunder on magnitude
    // alone (300 >= BLUNDER_CP); chess.com does not, because the win
    // probability moves only ~6 points. This is the case the deleted
    // STILL_WINNING_CP hack existed to paper over.
    //
    // NB the honest answer is "inaccuracy", NOT "unflagged" — a first draft of
    // this test asserted null and FAILED, correctly. Giving back three pawns is
    // still worth a word; it is the SEVERITY that centipawns got wrong.
    const lost = winPctLost(900, 600, true);
    expect(lost).toBeGreaterThanOrEqual(INACCURACY_WIN_PCT);
    expect(lost).toBeLessThan(MISTAKE_WIN_PCT);
    expect(bandForWinPctLost(lost)).toBe('inaccuracy');
  });

  it('100cp given back in a won position is not flagged at all', () => {
    // +9.00 → +8.00: a full pawn, and the game is no less won than it was.
    const lost = winPctLost(900, 800, true);
    expect(bandForWinPctLost(lost)).toBeNull();
  });

  it('the SAME 300cp thrown away near equality IS a blunder', () => {
    // +0.50 → −2.50: identical numeric drop, the game given away.
    const lost = winPctLost(50, -250, true);
    expect(lost).toBeGreaterThanOrEqual(BLUNDER_WIN_PCT);
    expect(bandForWinPctLost(lost)).toBe('blunder');
  });

  it("grades from the MOVER's side — Black losing ground is Black's error", () => {
    // White-POV evals: 0 → +300 is a collapse for BLACK, who moved.
    const lostForBlack = winPctLost(0, 300, false);
    expect(lostForBlack).toBeGreaterThan(0);
    expect(bandForWinPctLost(lostForBlack)).toBe('blunder');
    // And the same two evals judged as White's move read as a GAIN, not a loss.
    expect(winPctLost(0, 300, true)).toBeLessThan(0);
  });

  it("is symmetric: a loss for one side is the other side's gain", () => {
    expect(winPctLost(120, -40, true)).toBeCloseTo(-winPctLost(120, -40, false), 9);
  });
});

describe('winPercent — the model the bands sit on', () => {
  it('is 50% at a dead-level position and monotonic in the eval', () => {
    expect(winPercent(0)).toBeCloseTo(50, 9);
    expect(winPercent(200)).toBeGreaterThan(winPercent(100));
    expect(winPercent(-200)).toBeLessThan(winPercent(-100));
  });
});
