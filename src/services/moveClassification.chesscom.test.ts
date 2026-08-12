// Move labels must match chess.com, because that is what David compares them to.
//
// 🔒 THE TWO HALVES OF THE REVIEW GRADED IN DIFFERENT CURRENCIES. The accuracy
// PERCENTAGE was already built from the published model — win% via the lichess
// sigmoid, exponential decay, harmonic mean. But the move LABELS were raw
// centipawns (50 / 100 / 300), and chess.com does not grade in centipawns. It
// bands on EXPECTED POINTS LOST, which is the same quantity the accuracy figure
// comes from:
//
//     Best        0.00          Inaccuracy  0.05 – 0.10
//     Excellent   0.00 – 0.02   Mistake     0.10 – 0.20
//     Good        0.02 – 0.05   Blunder     0.20 – 1.00
//
// So the percentage could look close while the counts never matched.
//
// chess.com's own explanation is exactly the failure: "the same centipawn loss
// can be a mistake in a tense position and barely an inaccuracy in a decided
// one." The cases below are that sentence, made executable — the same cpLoss
// landing in different buckets depending on where the position already stood,
// which no centipawn threshold can express.
//
// Source: https://support.chess.com/en/articles/8572705
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { classifyCpLoss } from './gameAnalysisService';
import { winPercent } from './accuracyService';

/** Classify a white move from the two evals, the way the review does. */
const grade = (before: number, after: number) =>
  classifyCpLoss(before - after, before, after, true);

/** How much win% a move gave up — the quantity chess.com actually bands on. */
const lost = (before: number, after: number) => winPercent(before) - winPercent(after);

describe('the same centipawn loss grades differently by position', () => {
  it('300cp given back while completely winning is NOT a blunder', () => {
    // +9.0 → +6.0. Three whole pawns: a blunder by the old raw-cp rule, which
    // is why the old code carried a bespoke STILL_WINNING_CP patch to avoid
    // saying so. In expected points it costs 6.4 — an inaccuracy, two whole
    // bands milder, with no patch required.
    expect(lost(900, 600)).toBeCloseTo(6.4, 0);
    expect(grade(900, 600)).toBe('inaccuracy');
  });

  it('a full pawn dropped at dead equal IS a mistake', () => {
    // 0.00 → −1.20. The old rule called ANY drop past 100cp a mistake wherever
    // it happened; the band is now earned by the swing. Note 100cp exactly at
    // equality costs 9.1 points and lands an INACCURACY — the boundary sits
    // between them, which is chess.com's boundary, not one we chose.
    expect(lost(0, -100)).toBeCloseTo(9.1, 0);
    expect(grade(0, -100)).toBe('inaccuracy');
    expect(lost(0, -120)).toBeGreaterThanOrEqual(10);
    expect(grade(0, -120)).toBe('mistake');
  });

  it('a smaller cp loss at equality outranks a bigger one when winning', () => {
    // THE HEADLINE. 150cp at equality is graded worse than 300cp at +9 — which
    // is correct, and is impossible to express with a centipawn threshold.
    expect(lost(0, -150)).toBeGreaterThan(lost(900, 600));
  });
});

describe("the bands are chess.com's, in win-percentage points", () => {
  it('walks the whole ladder from a level position', () => {
    // Each case is chosen so the win% drop lands inside one published band.
    const cases: Array<[number, number, string]> = [
      [0, 0, 'good'],          //  0.0 pts — best
      [0, -20, 'good'],        //  ~1.8   — excellent/good band
      [0, -60, 'inaccuracy'],  //  ~5.5   — inaccuracy band
      [0, -120, 'mistake'],    // ~10.9   — mistake band
      [0, -260, 'blunder'],    // ~22.4   — blunder band
    ];
    for (const [before, after, want] of cases) {
      expect(grade(before, after), `${before} → ${after} (lost ${lost(before, after).toFixed(1)} win%)`)
        .toBe(want);
    }
  });

  it("grades a black move from black's side, not white's", () => {
    // Evals are white-POV throughout, so a black move that worsens black's
    // position is a RISING white eval. Getting the sign wrong here would
    // invert every label for one player — half the review, silently.
    const blackBlunder = classifyCpLoss(-260, 0, 260, false);
    expect(blackBlunder).toBe('blunder');
    const blackFine = classifyCpLoss(20, 0, -20, false);
    expect(blackFine).toBe('good');
  });
});

describe('the special cases survive the currency change', () => {
  it('still never calls a mating move a blunder', () => {
    // The engine returns 0 for a checkmated position, so the raw swing from
    // +winning to 0 reads as catastrophic. Board truth wins.
    expect(classifyCpLoss(900, 900, 0, true, true)).not.toBe('blunder');
  });

  it('still falls back to centipawn bands when an eval is missing', () => {
    // A partial analysis must stay labelled rather than silently reading
    // 'good' — which is what an unguarded win% path would do with nulls.
    expect(classifyCpLoss(350, null, null, true)).toBe('blunder');
    expect(classifyCpLoss(120, null, null, true)).toBe('mistake');
    expect(classifyCpLoss(60, null, null, true)).toBe('inaccuracy');
  });

  it('does not reinstate the still-winning escape hatch', () => {
    // The patch existed to approximate, in centipawns, what win% does natively.
    // If it comes back it will start disagreeing with the accuracy figure again.
    // Code only — the name is still spoken in the comment that explains why it
    // went, and that explanation is worth keeping.
    const src = readFileSync('src/services/gameAnalysisService.ts', 'utf8');
    expect(src, 'STILL_WINNING_CP is back — win% already handles this')
      .not.toMatch(/const\s+STILL_WINNING_CP/);
  });
});
