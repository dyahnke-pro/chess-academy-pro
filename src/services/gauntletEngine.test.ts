import { describe, it, expect } from 'vitest';
import {
  initGauntletState,
  heroCaptureTargets,
  applyGauntletCapture,
  enemyGuardedSquares,
  isGauntletSolvable,
  gauntletPosition,
  type GauntletLevel,
} from './gauntletEngine';

const L = (over: Partial<GauntletLevel> = {}): GauntletLevel => ({
  id: 1,
  name: 'test',
  hero: { type: 'queen', square: 'd4' },
  enemies: [{ type: 'rook', square: 'a4' }],
  showGuarded: true,
  ...over,
});

describe('gauntletEngine', () => {
  it('heroCaptureTargets returns reachable enemies only (rays stop at first blocker)', () => {
    // Queen d4; enemy rook a4 (reachable along rank), enemy bishop behind
    // another enemy on the same ray is NOT directly capturable.
    const st = initGauntletState(L({
      enemies: [
        { type: 'rook', square: 'f4' },   // first on the rank → capturable
        { type: 'bishop', square: 'h4' },  // behind f4 → blocked
      ],
    }));
    const t = heroCaptureTargets(st);
    expect(t).toContain('f4');
    expect(t).not.toContain('h4');
  });

  it('a capture removes the enemy and moves the hero', () => {
    const st = initGauntletState(L({ enemies: [{ type: 'rook', square: 'a4' }] }));
    const next = applyGauntletCapture(st, 'a4');
    expect(next.hero.square).toBe('a4');
    expect(next.enemies).toHaveLength(0);
    expect(next.status).toBe('won');
    expect(next.moveCount).toBe(1);
  });

  it('capturing a DEFENDED piece loses (recaptured)', () => {
    // Queen d4 reaches a4 (rank) and d7 (file). Bishop d7 guards a4
    // (d7-a4 diagonal). Grabbing a4 lands on a square d7 still defends.
    const st = initGauntletState(L({
      hero: { type: 'queen', square: 'd4' },
      enemies: [
        { type: 'rook', square: 'a4' },
        { type: 'bishop', square: 'd7' }, // guards a4
      ],
    }));
    const next = applyGauntletCapture(st, 'a4');
    expect(next.status).toBe('lost');
  });

  it('capturing the undefended piece first is safe', () => {
    const st = initGauntletState(L({
      hero: { type: 'queen', square: 'd4' },
      enemies: [
        { type: 'rook', square: 'a4' },
        { type: 'bishop', square: 'd7' },
      ],
    }));
    // d7 is undefended → safe; then a4 is undefended → win.
    const afterD7 = applyGauntletCapture(st, 'd7');
    expect(afterD7.status).toBe('playing');
    const afterA4 = applyGauntletCapture(afterD7, 'a4');
    expect(afterA4.status).toBe('won');
  });

  it('an illegal (non-capture / unreachable) target leaves the state unchanged', () => {
    const st = initGauntletState(L());
    const same = applyGauntletCapture(st, 'b2'); // empty square
    expect(same).toBe(st);
  });

  it('enemyGuardedSquares accounts for the hero as a blocker', () => {
    const guarded = enemyGuardedSquares([{ type: 'rook', square: 'a1' }], null);
    expect(guarded.has('a8')).toBe(true);
    expect(guarded.has('h1')).toBe(true);
  });

  it('isGauntletSolvable: true when a safe order exists, false for a deadlock', () => {
    const solvable = L({
      hero: { type: 'queen', square: 'd4' },
      enemies: [
        { type: 'rook', square: 'a4' },
        { type: 'bishop', square: 'd7' }, // guards a4; take d7 first
      ],
    });
    expect(isGauntletSolvable(solvable)).toBe(true);

    // Two rooks mutually defending on the a-file — every capture lands
    // on a square the other rook still guards → no safe order.
    const deadlock = L({
      hero: { type: 'queen', square: 'd4' },
      enemies: [
        { type: 'rook', square: 'a4' },
        { type: 'rook', square: 'a7' }, // defends a4; a4 defends a7
      ],
    });
    expect(isGauntletSolvable(deadlock)).toBe(false);
  });

  it('gauntletPosition maps hero white + enemies black', () => {
    const pos = gauntletPosition(initGauntletState(L()));
    expect(pos['d4']).toEqual({ pieceType: 'wQ' });
    expect(pos['a4']).toEqual({ pieceType: 'bR' });
  });
});
