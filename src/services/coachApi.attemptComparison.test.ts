/**
 * Walk defect 11, the ANSWER half (hand walk 2026-10-04, custom lesson drill):
 * "why is that move better than what I played?" — what they played was a try
 * the drill took back, so it is on no tape. The answer is the comparison:
 * THEIR move, what it cost, and (once it is not a live question) the better
 * move with its reason. Rated off the FEN, not off a ply.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const computeMoveRatingFromFen = vi.fn();
vi.mock('./moveRating', async (importOriginal) => {
  const real = await importOriginal<typeof import('./moveRating')>();
  return { ...real, computeMoveRatingFromFen: (...a: unknown[]) => computeMoveRatingFromFen(...a) };
});

import { answerAttemptComparison } from './coachApi';

// White to move: Nxc7+ forks king and rook; Nxe7 is the stronger shot (walk shape).
const FEN = 'r3k2r/pp1bbppp/2n1p3/1N1pP3/3P4/8/PP3PPP/R1B1KB1R w KQkq - 0 12';

describe('answerAttemptComparison', () => {
  beforeEach(() => computeMoveRatingFromFen.mockReset());

  it('names the student\'s move, its cost, and the better move WITH its reason', async () => {
    computeMoveRatingFromFen.mockResolvedValue({
      playedSan: 'Nc7+', studentColor: 'white', wasBest: false, cpLoss: 170, quality: 'mistake',
      betterSan: 'Nd6+', betterFromTo: { from: 'b5', to: 'd6' }, missedMate: null, allowedMate: null,
      brilliancy: null, brilliancyWhy: null, evalAfterMoverCp: 180,
    });
    const a = await answerAttemptComparison({ fenBefore: FEN, san: 'Nc7+', withholdBest: false });
    expect(a?.facts).toMatch(/^Your Nc7\+ on move 12/);
    expect(a?.facts).toMatch(/mistake: it cost about 1\.7 points/);
    expect(a?.facts).toMatch(/The engine preferred Nd6\+/);
    expect(a?.bestMoveSan).toBe('Nd6+');
  });

  it('an unsolved drill keeps the better move WITHHELD — the cost is said, the answer is not', async () => {
    computeMoveRatingFromFen.mockResolvedValue({
      playedSan: 'Nc7+', studentColor: 'white', wasBest: false, cpLoss: 170, quality: 'mistake',
      betterSan: 'Nd6+', betterFromTo: { from: 'b5', to: 'd6' }, missedMate: null, allowedMate: null,
      brilliancy: null, brilliancyWhy: null, evalAfterMoverCp: 180,
    });
    const a = await answerAttemptComparison({ fenBefore: FEN, san: 'Nc7+', withholdBest: true });
    expect(a?.facts).toMatch(/^Your Nc7\+/);
    expect(a?.facts).not.toMatch(/Nd6/);
    expect(a?.facts).toMatch(/There's a stronger move here — find it/);
    expect(a?.bestMoveSan).toBeNull();
  });

  it('their move WAS the best → said so, nothing withheld or invented', async () => {
    computeMoveRatingFromFen.mockResolvedValue({
      playedSan: 'Nd6+', studentColor: 'white', wasBest: true, cpLoss: 0, quality: 'best',
      betterSan: null, betterFromTo: null, missedMate: null, allowedMate: null,
      brilliancy: null, brilliancyWhy: null, evalAfterMoverCp: 350,
    });
    const a = await answerAttemptComparison({ fenBefore: FEN, san: 'Nd6+', withholdBest: true });
    expect(a?.facts).toMatch(/engine's top move/);
    expect(a?.facts).not.toMatch(/stronger move here/);
  });

  it('NEGATIVE CONTROL — no engine read → null (the lane falls through, no guess)', async () => {
    computeMoveRatingFromFen.mockResolvedValue(null);
    expect(await answerAttemptComparison({ fenBefore: FEN, san: 'Nc7+', withholdBest: false })).toBeNull();
  });
});
