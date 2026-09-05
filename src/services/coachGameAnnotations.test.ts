import { describe, it, expect } from 'vitest';
import { movesToAnnotations, LIVE_ANALYSIS_DEPTH } from './coachGameAnnotations';
import type { CoachGameMove } from '../types';

function mv(over: Partial<CoachGameMove> & Pick<CoachGameMove, 'moveNumber' | 'san' | 'isCoachMove'>): CoachGameMove {
  return {
    fen: 'x', commentary: '', evaluation: 10, classification: null, bestMove: null, bestMoveEval: 5,
    ...over,
  } as CoachGameMove;
}

describe('movesToAnnotations — the live game IS the analysis', () => {
  const moves: CoachGameMove[] = [
    mv({ moveNumber: 1, san: 'e4', isCoachMove: false, classification: 'good', evaluation: 30, bestMoveEval: 20, bestMove: null }),
    mv({ moveNumber: 2, san: 'e5', isCoachMove: true, evaluation: 25, bestMoveEval: 30 }),
    mv({ moveNumber: 3, san: 'Qh5', isCoachMove: false, classification: 'mistake', evaluation: -80, bestMoveEval: 25, bestMove: 'Nf3', commentary: 'early queen' }),
    mv({ moveNumber: 4, san: 'Nc6', isCoachMove: true, evaluation: null }),
  ];

  it('files BOTH sides so the review has a continuous eval curve', () => {
    const anns = movesToAnnotations(moves, 'white');
    expect(anns.map((a) => a.san)).toEqual(['e4', 'e5', 'Qh5']);
    expect(anns[1]).toMatchObject({ color: 'black', evaluation: 25, classification: 'good' });
  });

  it('never files the coach\'s (rating-throttled) pick as a best move', () => {
    const anns = movesToAnnotations(moves, 'white');
    expect(anns[1].bestMove).toBeNull();
    // …but the student's honest best move survives.
    expect(anns[2]).toMatchObject({ bestMove: 'Nf3', classification: 'mistake', comment: 'early queen' });
  });

  it('skips a coach ply the engine never scored rather than inventing a grade', () => {
    const anns = movesToAnnotations(moves, 'white');
    expect(anns.find((a) => a.san === 'Nc6')).toBeUndefined();
  });

  it('stamps a depth below the review ceiling so the review still deepens key moments', () => {
    expect(LIVE_ANALYSIS_DEPTH).toBeLessThan(16);
  });
});
