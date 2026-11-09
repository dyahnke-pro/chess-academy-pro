/**
 * WHAT THE LEARN REPLY WAITS ON (`learnReplyWait`). A late wave whose board
 * the student has already left is thrown away — so a verdict built from the
 * move's price, when the reply played before the price landed and a quick
 * student moved on, was never said (local focus audit 2026-11-09: 7 of 11
 * turns dropped; prod rung-2 game 2, ply 14: a planted knight missed and
 * nothing said). The reply now waits on the verdict's own reads whenever a
 * verdict may be due.
 */
import { describe, expect, it } from 'vitest';
import { learnReplyWait } from './learnBoardTeaching';
import { REASON_WAIT_CEILING_MS, VERDICT_WAIT_CEILING_MS } from './decisiveReason';
import type { AnalysisLine } from '../types';

const line = (rank: number, evaluation: number): AnalysisLine => ({ rank, evaluation, moves: ['e2e4'], mate: null });
/** A real decision for White: the best is a pawn and a half clear of the next. */
const DECISION = [line(1, 150), line(2, 0)];
/** A quiet board: everything is about equal. */
const QUIET = [line(1, 20), line(2, 15)];

describe('learnReplyWait — the reply waits on the reads its verdict is built from', () => {
  it('a missed focus chance: the reply waits on the price, up to the verdict ceiling', () => {
    const w = learnReplyWait({ lines: QUIET, mover: 'w', inBook: false, graded: true, gradeFault: false, focusMiss: true });
    expect(w.waitPrice).toBe(true);
    expect(w.ceilingMs).toBe(VERDICT_WAIT_CEILING_MS);
  });

  it('a move the read before it graded a fault waits on the price, up to the verdict ceiling', () => {
    const w = learnReplyWait({ lines: QUIET, mover: 'w', inBook: false, graded: true, gradeFault: true, focusMiss: false });
    expect(w).toMatchObject({ waitPrice: true, ceilingMs: VERDICT_WAIT_CEILING_MS });
  });

  it('an ungraded move out of book waits on the price, up to the reason ceiling', () => {
    const w = learnReplyWait({ lines: QUIET, mover: 'w', inBook: false, graded: false, gradeFault: false, focusMiss: false });
    expect(w).toMatchObject({ waitPrice: true, ceilingMs: REASON_WAIT_CEILING_MS });
  });

  it('a real decision warms the reason as before', () => {
    const w = learnReplyWait({ lines: DECISION, mover: 'w', inBook: false, graded: true, gradeFault: false, focusMiss: false });
    expect(w).toMatchObject({ warmReason: true, waitPrice: false, ceilingMs: REASON_WAIT_CEILING_MS });
  });

  it('NEGATIVE CONTROL: a clean graded move on a quiet board, or a book move, replies at once', () => {
    expect(learnReplyWait({ lines: QUIET, mover: 'w', inBook: false, graded: true, gradeFault: false, focusMiss: false }))
      .toEqual({ ceilingMs: 0, warmReason: false, waitPrice: false });
    expect(learnReplyWait({ lines: DECISION, mover: 'w', inBook: true, graded: false, gradeFault: false, focusMiss: false }))
      .toEqual({ ceilingMs: 0, warmReason: false, waitPrice: false });
  });
});
