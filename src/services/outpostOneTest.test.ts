// OS-11 #4: one outpost test. `forwardTeaching.isKnightOutpost` was a copy of
// `outpost.isOutpost(…, true)` that refused an OCCUPIED square — so the worst-
// piece finder's "a minor on an outpost is doing a job" gate never fired, and
// the review could call one piece an outpost and the worst piece in one breath.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findWorstPlacedPiece } from './nextPlans';
import { describeStructure } from './boardStructure';
import { computePieceRoute } from './forwardTeaching';
import { boardTeacherPoint } from './learnBoardTeaching';
import { outpostKey } from './conceptKey';

describe('one outpost test, read by every outpost consumer', () => {
  // White bishop on d5: backed by c4/e4, no black pawn can ever hit it, boxed
  // in by its own pawns on c6/e6 (mobility 0).
  const BOXED = '6k1/8/2P1P3/3B4/2P1P3/8/8/6K1 w - - 0 1';
  it('a minor on an outpost is never the worst piece (old code named it)', () => {
    expect(describeStructure(BOXED)?.outposts.some((o) => o.square === 'd5')).toBe(true);
    expect(findWorstPlacedPiece(new Chess(BOXED), 'w')?.sq).not.toBe('d5');
  });
  it('the knight route still targets an EMPTY outpost', () => {
    expect(computePieceRoute('4k3/p4p2/8/8/4P3/8/8/1N2K3 w - - 0 1', 'b1')?.target).toBe('d5');
  });
});

describe('the f6 outpost is one claim across the turns (g1 29.Nf6 → 31.g5)', () => {
  const AFTER_G5 = 'r7/pp3k2/3p1N2/6P1/3nP3/1P6/6K1/5R2 b - - 0 31';
  it('31.g5 "makes f6 an outpost" carries outpost:f6, the key the rule clause gives 29.Nf6', () => {
    // The board before 31.g5: the g-pawn on g4.
    const before = 'r7/pp3k2/3p1N2/8/3nP1P1/1P6/6K1/5R2 w - - 0 31';
    const hint = boardTeacherPoint(before, 'g5', AFTER_G5);
    expect(hint?.text).toMatch(/f6 an outpost/);
    expect(hint?.claims).toContain(outpostKey('f6'));
  });
});
