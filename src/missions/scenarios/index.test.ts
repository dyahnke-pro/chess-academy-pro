import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { SCENARIOS, SCENARIO_TRANSITION_LABEL, scenarioPosition, seedIndex } from './index';
import kpTriangulation from './kpTriangulation.json';

/**
 * The provider rules every library shares (each library's own board rules are
 * tested beside it). The K+Q vs K library was removed on 2026-10-23: the
 * Level 1 endgame plays out the student's own game.
 */
describe('the scenario providers', () => {
  it('the same seed gives the same board; any number is a seed', () => {
    expect(scenarioPosition('kp-triangulation', 'w', 42)).toBe(scenarioPosition('kp-triangulation', 'w', 42));
    expect(scenarioPosition('kp-triangulation', 'w', 2 ** 40 + 3)).not.toBeNull();
    expect(scenarioPosition('kp-triangulation', 'b', Number.NaN)).toBe(kpTriangulation.b[0].fen);
    expect(seedIndex(-1, 10)).toBe(9);
    expect(seedIndex(3.9, 10)).toBe(3);
    expect(seedIndex(Number.POSITIVE_INFINITY, 10)).toBe(0);
    expect(seedIndex(5, 0)).toBe(-1);
  });

  it('over 1,000 seeds every board of a colour is reached, and none comes back for the wrong colour', () => {
    for (const colour of ['w', 'b'] as const) {
      const seen = new Set<string>();
      for (let seed = -500; seed < 500; seed++) {
        const fen = scenarioPosition('kp-triangulation', colour, seed) as string;
        expect(new Chess(fen).turn()).toBe(colour);
        seen.add(fen);
      }
      expect(seen.size).toBe(kpTriangulation[colour].length);
    }
  });

  it('every scenario id has a provider with boards for both colours, and the UI has its label', () => {
    for (const p of Object.values(SCENARIOS)) {
      expect(p.size('w')).toBeGreaterThan(0);
      expect(p.size('b')).toBeGreaterThan(0);
    }
    expect(Object.keys(SCENARIOS)).not.toContain('kq-vs-k');
    expect(SCENARIO_TRANSITION_LABEL).toBe('Endgame scene');
  });
});
