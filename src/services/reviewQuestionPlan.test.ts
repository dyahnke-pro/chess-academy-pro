import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { selectReviewQuestions, playedCaptureIsPoisoned, type QuestionPlanSegmentLike } from './reviewQuestionPlan';

function seg(o: Partial<QuestionPlanSegmentLike> & { ply: number }): QuestionPlanSegmentLike {
  return {
    san: 'Nf3',
    fenBefore: new Chess().fen(),
    classification: 'mistake',
    evalBefore: 0,
    evalAfter: -150,
    bestMoveUci: null,
    bestMoveSan: null,
    isCoachMove: false,
    playerColor: o.ply % 2 === 1 ? 'white' : 'black',
    ...o,
  };
}

describe('selectReviewQuestions — relevance + budget (David 2026-07-20)', () => {
  it('caps at the budget and keeps the BIGGEST swings', () => {
    const segs = [
      seg({ ply: 3, evalBefore: 20, evalAfter: -80 }),   // ~1.0 loss
      seg({ ply: 9, evalBefore: 50, evalAfter: -450 }),  // ~5.0 loss (biggest)
      seg({ ply: 15, evalBefore: 10, evalAfter: -260 }), // ~2.7 loss
    ];
    const plan = selectReviewQuestions(segs, 'white', { budget: 2 });
    expect(plan.size).toBe(2);
    // the two biggest (ply 9 and 15), not the small ply-3 one.
    expect(plan.has(9)).toBe(true);
    expect(plan.has(15)).toBe(true);
    expect(plan.has(3)).toBe(false);
  });

  it('never stops at the opponent moves or clean moves', () => {
    const segs = [
      seg({ ply: 4, playerColor: 'black', isCoachMove: true, evalBefore: 300, evalAfter: -300 }), // opponent
      seg({ ply: 5, playerColor: 'white', classification: 'good', evalBefore: 0, evalAfter: 5 }), // clean
      seg({ ply: 7, playerColor: 'white', classification: 'blunder', evalBefore: 40, evalAfter: -400 }), // student blunder
    ];
    const plan = selectReviewQuestions(segs, 'white', { budget: 3 });
    expect(plan.size).toBe(1);
    expect(plan.has(7)).toBe(true);
  });

  it('tags a missed winning shot as find-shot', () => {
    // Student was +2 and had a distinct engine best move → find-shot.
    const s = seg({ ply: 11, classification: 'mistake', evalBefore: 200, evalAfter: 20, bestMoveUci: 'd2d4', bestMoveSan: 'd4', san: 'a3' });
    const plan = selectReviewQuestions([s], 'white', { budget: 2 });
    expect(plan.get(11)?.kind).toBe('find-shot');
  });

  it('tags a greedy poisoned capture as trap', () => {
    // White to move, Qxd5?? exd5 loses the queen — the flagged move IS the grab.
    const fen = '4k3/8/4p3/3p4/8/8/8/3QK3 w - - 0 1';
    const s = seg({ ply: 13, classification: 'blunder', fenBefore: fen, san: 'Qxd5', evalBefore: 50, evalAfter: -700, bestMoveUci: null, bestMoveSan: null });
    const plan = selectReviewQuestions([s], 'white', { budget: 2 });
    expect(plan.get(13)?.kind).toBe('trap');
  });

  it('does NOT stop the student on a still-WINNING move (audit 2026-07-20)', () => {
    // A flagged move (big cpLoss) that still leaves White at +4 → no question.
    const s = seg({ ply: 15, playerColor: 'white', classification: 'blunder', evalBefore: 830, evalAfter: 400, san: 'Bxd7+', bestMoveUci: 'x', bestMoveSan: 'y' });
    const plan = selectReviewQuestions([s], 'white', { budget: 2 });
    expect(plan.size).toBe(0);
  });

  it('falls back to why for a plain positional slip', () => {
    const s = seg({ ply: 7, classification: 'inaccuracy', evalBefore: 10, evalAfter: -60, san: 'h3', bestMoveUci: null });
    const plan = selectReviewQuestions([s], 'white', { budget: 2 });
    expect(plan.get(7)?.kind).toBe('why');
  });
});

describe('playedCaptureIsPoisoned', () => {
  it('true for a queen grabbing a defended pawn (Qxd5?? exd5)', () => {
    expect(playedCaptureIsPoisoned('4k3/8/4p3/3p4/8/8/8/3QK3 w - - 0 1', 'Qxd5')).toBe(true);
  });
  it('false for a safe capture of a free piece', () => {
    // Black knight e5 undefended; White pawn d4 takes it for free.
    expect(playedCaptureIsPoisoned('4k3/8/8/4n3/3P4/8/8/4K3 w - - 0 1', 'dxe5')).toBe(false);
  });
  it('false for a non-capture', () => {
    expect(playedCaptureIsPoisoned(new Chess().fen(), 'e4')).toBe(false);
  });
});
