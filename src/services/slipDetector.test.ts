import { describe, it, expect } from 'vitest';
import { detectSlip, SLIP_CP, mistakeThresholdForRating } from './slipDetector';

describe('mistakeThresholdForRating (rating-adaptive bucket gate)', () => {
  it('holds 1500+ players to ≥0.5 pawn, everyone else to ≥1.0', () => {
    expect(mistakeThresholdForRating(2100)).toBe(SLIP_CP.inaccuracy); // 50 — advanced
    expect(mistakeThresholdForRating(1500)).toBe(SLIP_CP.inaccuracy); // 50 — boundary is inclusive
    expect(mistakeThresholdForRating(1499)).toBe(SLIP_CP.mistake);    // 100 — below the line
    expect(mistakeThresholdForRating(800)).toBe(SLIP_CP.mistake);     // 100 — beginner
    expect(mistakeThresholdForRating(undefined)).toBe(SLIP_CP.mistake); // unknown → 1.0
  });
});

describe('detectSlip', () => {
  it('following the book move is never a slip', () => {
    const r = detectSlip({
      inBook: true, bookMoveSan: 'Nf3', playedSan: 'Nf3',
      evalBeforeCp: 20, evalAfterCp: 20, learned: true,
    });
    expect(r.isSlip).toBe(false);
  });

  it('leaving book into a worse move fires with reason left-book', () => {
    const r = detectSlip({
      inBook: true, bookMoveSan: 'Ba4', playedSan: 'Bxc6',
      evalBeforeCp: 30, evalAfterCp: 30 - SLIP_CP.mistake, learned: true,
    });
    expect(r.isSlip).toBe(true);
    expect(r.reason).toBe('left-book');
    expect(r.severity).toBe('mistake');
    expect(r.shouldCount).toBe(true);
  });

  it('an eval drop while already off-book fires with reason eval-drop', () => {
    const r = detectSlip({
      inBook: false, playedSan: 'h3',
      evalBeforeCp: 50, evalAfterCp: 50 - SLIP_CP.blunder, learned: true,
    });
    expect(r.isSlip).toBe(true);
    expect(r.reason).toBe('eval-drop');
    expect(r.severity).toBe('blunder');
  });

  it('a small eval wobble below the inaccuracy floor is not a slip', () => {
    const r = detectSlip({
      inBook: false, playedSan: 'Re1',
      evalBeforeCp: 40, evalAfterCp: 40 - (SLIP_CP.inaccuracy - 1), learned: true,
    });
    expect(r.isSlip).toBe(false);
  });

  it('a slip on an unlearned line is real but should NOT count (gate)', () => {
    const r = detectSlip({
      inBook: false, playedSan: 'Qh5',
      evalBeforeCp: 0, evalAfterCp: -SLIP_CP.mistake, learned: false,
    });
    expect(r.isSlip).toBe(true);
    expect(r.shouldCount).toBe(false);
  });

  it('an improving move (negative cpLoss) is never a slip', () => {
    const r = detectSlip({
      inBook: false, playedSan: 'Nxe5',
      evalBeforeCp: 10, evalAfterCp: 120, learned: true,
    });
    expect(r.isSlip).toBe(false);
  });
});
