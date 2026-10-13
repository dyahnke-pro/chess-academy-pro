import { describe, it, expect } from 'vitest';
import { measuredCpLoss } from './autoAnalyzeGame';
import { MATE_EVAL_VALUE } from './engineConstants';
import type { MoveAnnotation } from '../types';

const ann = (o: Partial<MoveAnnotation>): MoveAnnotation => ({ moveNumber: 20, color: 'white', san: 'Qxd7+', evaluation: 700, bestMove: 'e7f8r', bestMoveEval: MATE_EVAL_VALUE, classification: 'blunder', comment: null, ...o });

describe('measuredCpLoss — a missed mate is measured, never the 350 sentinel (2026-10-13)', () => {
  it('Qxd7+ with exf8=R# on the board costs the mate, capped — not exactly 350', () => {
    const loss = measuredCpLoss(ann({}));
    expect(loss).not.toBe(350);
    expect(loss).toBe(1500 - 700);
  });
  it('an ordinary loss is the plain difference, mover-relative', () => {
    expect(measuredCpLoss(ann({ color: 'black', evaluation: 120, bestMoveEval: -30 }))).toBe(150);
  });
  it('no best-move eval → unmeasured (null), never a label guess here', () => {
    expect(measuredCpLoss(ann({ bestMoveEval: null }))).toBeNull();
  });
});
