// Batch C (David 2026-09-01): the post-game review scopes to the student's
// trainingFocus phase. Pure grounded summary over getPhaseBreakdown numbers.
import { describe, it, expect } from 'vitest';
import { phaseScopedReviewSummary, isPhaseFocus } from './gamePhaseService';
import type { PhaseAccuracy } from '../types';

const bd = (over: Partial<Record<'opening' | 'middlegame' | 'endgame', Partial<PhaseAccuracy>>> = {}): PhaseAccuracy[] =>
  (['opening', 'middlegame', 'endgame'] as const).map((phase) => ({
    phase, accuracy: 90, moveCount: 10, mistakes: 0, ...over[phase],
  }));

describe('phaseScopedReviewSummary', () => {
  it('leads with the focus phase when it was the leakiest', () => {
    const out = phaseScopedReviewSummary(bd({
      middlegame: { accuracy: 68, mistakes: 3 },
      opening: { accuracy: 95, mistakes: 0 },
      endgame: { accuracy: 88, mistakes: 1 },
    }), 'middlegame');
    expect(out).not.toBeNull();
    expect(out!.wasWorstPhase).toBe(true);
    expect(out!.facts).toMatch(/middlegame/);
    expect(out!.facts).toMatch(/turned there|leakiest/);
    expect(out!.facts).toMatch(/3 slips/);
    expect(out!.facts).toMatch(/68%/);
  });

  it('is honest when the focus phase held up and trouble was elsewhere', () => {
    const out = phaseScopedReviewSummary(bd({
      middlegame: { accuracy: 93, mistakes: 0 },
      endgame: { accuracy: 62, mistakes: 3 },
    }), 'middlegame');
    expect(out!.wasWorstPhase).toBe(false);
    expect(out!.facts).toMatch(/held/);
    expect(out!.facts).toMatch(/endgame/); // names where it actually went wrong
    expect(out!.facts).toMatch(/no slips/);
  });

  it('returns null when the focus phase never occurred in this game', () => {
    const out = phaseScopedReviewSummary(bd({ endgame: { moveCount: 0, accuracy: 0 } }), 'endgame');
    expect(out).toBeNull();
  });

  it('handles a single slip grammatically', () => {
    const out = phaseScopedReviewSummary(bd({ endgame: { accuracy: 70, mistakes: 1 }, middlegame: { mistakes: 0 }, opening: { mistakes: 0 } }), 'endgame');
    expect(out!.facts).toMatch(/1 slip\b/);
    expect(out!.facts).not.toMatch(/1 slips/);
  });

  it('isPhaseFocus only accepts the three phases', () => {
    expect(isPhaseFocus('middlegame')).toBe(true);
    expect(isPhaseFocus('endgame')).toBe(true);
    expect(isPhaseFocus('opening')).toBe(true);
    expect(isPhaseFocus('tactics')).toBe(false);
    expect(isPhaseFocus('calculation')).toBe(false);
    expect(isPhaseFocus(null)).toBe(false);
    expect(isPhaseFocus(undefined)).toBe(false);
  });
});
