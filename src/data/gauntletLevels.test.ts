import { describe, it, expect } from 'vitest';
import { QUEEN_GAUNTLET_LEVELS } from './gauntletLevels';
import {
  isGauntletSolvable,
  initGauntletState,
  heroCaptureTargets,
  applyGauntletCapture,
  enemyGuardedSquares,
} from '../services/gauntletEngine';

describe('QUEEN_GAUNTLET_LEVELS', () => {
  it('has sequential ids and unique piece squares per level', () => {
    QUEEN_GAUNTLET_LEVELS.forEach((lvl, i) => {
      expect(lvl.id).toBe(i + 1);
      const squares = [lvl.hero.square, ...lvl.enemies.map((e) => e.square)];
      expect(new Set(squares).size).toBe(squares.length);
      for (const s of squares) expect(s).toMatch(/^[a-h][1-8]$/);
    });
  });

  it('every level is WINNABLE (a safe capture order exists)', () => {
    for (const lvl of QUEEN_GAUNTLET_LEVELS) {
      expect(isGauntletSolvable(lvl), `level ${lvl.id} ${lvl.name} unsolvable`).toBe(true);
    }
  });

  it('every level has at least one capture available at the start', () => {
    for (const lvl of QUEEN_GAUNTLET_LEVELS) {
      expect(heroCaptureTargets(initGauntletState(lvl)).length, `level ${lvl.id}`).toBeGreaterThan(0);
    }
  });

  it('every level is NON-TRIVIAL — at least one first capture is a trap', () => {
    // If grabbing any piece were always safe, there is nothing to think
    // about. Each level must punish at least one greedy capture.
    for (const lvl of QUEEN_GAUNTLET_LEVELS) {
      const st = initGauntletState(lvl);
      const anyTrap = heroCaptureTargets(st).some(
        (t) => applyGauntletCapture(st, t).status === 'lost',
      );
      const anyDefended = lvl.enemies.some((e) =>
        enemyGuardedSquares(lvl.enemies, lvl.hero.square).has(e.square),
      );
      expect(anyTrap && anyDefended, `level ${lvl.id} ${lvl.name} is trivial`).toBe(true);
    }
  });
});
