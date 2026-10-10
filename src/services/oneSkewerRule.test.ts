/**
 * ONE SKEWER RULE (census 2026-10-10): the per-move classifier and the
 * whole-board detector read the same test (`pinGeometry.isRealSkewer`), so a
 * skewer the coach teaches is a skewer it catches. Fails on the old code: the
 * classifier called Ra1 a skewer of an undefended knight with a pawn behind,
 * which the detector never did.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { classifyPosition } from './tacticClassifier';
import { detectTactics } from './tacticsDetector';
import { isRealSkewer } from './pinGeometry';

const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const classified = (fen: string, san: string): boolean =>
  classifyPosition(fen, after(fen, san), san, 0, 0).tactics.some((t) => t.type === 'skewer');
const detected = (fen: string, san: string): boolean =>
  detectTactics(after(fen, san)).tactics.some((t) => t.type === 'skewer');

describe('one skewer rule', () => {
  it('a king forced off the line with the queen behind is a skewer — both say so', () => {
    const fen = 'q7/8/8/k7/8/8/8/1R2K3 w - - 0 1';
    expect(isRealSkewer(new Chess(after(fen, 'Ra1+')), 'a1', 'a5', 'a8')).toBe(true);
    expect(classified(fen, 'Ra1+')).toBe(true);
    expect(detected(fen, 'Ra1+')).toBe(true);
  });
  it('an undefended knight with a pawn behind is a hanging knight, not a skewer — both say so', () => {
    const fen = '4k3/p7/8/n7/8/8/8/1R2K3 w - - 0 1';
    expect(isRealSkewer(new Chess(after(fen, 'Ra1')), 'a1', 'a5', 'a7')).toBe(false);
    expect(classified(fen, 'Ra1')).toBe(false);
    expect(detected(fen, 'Ra1')).toBe(false);
  });
});
