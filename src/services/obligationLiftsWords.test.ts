/**
 * "NO LONGER HANGS" IS NOT "NOT ATTACKED" (Review prod audit 2026-11-16,
 * Giri–Carlsen): after 24.Qf4 the coach said "your pawn on a5 isn't attacked
 * any more" — their rook on a1 still hits it down the a-file; what changed is
 * that one guard now holds it. The computer reads `computeMustDefend` (hangs or
 * not), so every wording says that.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { obligationLifts } from './opponentMoveReads';

const PREV = '2r2rk1/q2bbpp1/4p2p/p3P3/3PN3/5N2/1P1Q2PP/R3R2K b - - 1 23';

describe('obligationLifts says what it computed', () => {
  it('never says a piece the rook still hits is not attacked', () => {
    const r = obligationLifts(PREV, 'Bc6', 'Qf4', 'b');
    expect(r).not.toBeNull();
    const c = new Chess(PREV); c.move('Bc6'); c.move('Qf4');
    expect(c.attackers('a5', 'w').length).toBeGreaterThan(0);
    expect(r?.text).not.toMatch(/isn't attacked|not attacked/);
  });
});
