import { describe, it, expect } from 'vitest';
import { rankThemeTargets } from './puzzleThemeTargets';
import type { WeaknessSignal } from './weaknessSignal';

const ALL = ['fork', 'pin', 'skewer', 'discoveredAttack', 'backRankMate'];

function hole(over: Partial<WeaknessSignal>): WeaknessSignal {
  return { clusterId: 'analysis:tactic:pin', bucket: 'tactical', label: 'Pins', openCount: 3, severity: 50, puzzleThemes: ['pin'], total: 3, ...over } as WeaknessSignal;
}

describe('rankThemeTargets — the next puzzle trains what the whole record says', () => {
  it('an open hole from their GAMES leads, ahead of any puzzle-only signal', () => {
    const r = rankThemeTargets([hole({})], [{ theme: 'fork', accuracy: 0.2, attempts: 10 }], ALL, 0, 3);
    expect(r[0]).toBe('pin');
    expect(r[1]).toBe('fork');
  });

  it('the worst hole leads; a fixed hole is not red', () => {
    const r = rankThemeTargets([
      hole({ clusterId: 'a', puzzleThemes: ['skewer'], severity: 30 }),
      hole({ clusterId: 'b', puzzleThemes: ['backRankMate'], severity: 90 }),
      hole({ clusterId: 'c', puzzleThemes: ['fork'], severity: 99, lifecycleStatus: 'fixed' }),
    ], ALL.map((theme) => ({ theme, accuracy: 0.9, attempts: 10 })), ALL, 0, 5);
    expect(r).toEqual(['backRankMate', 'skewer']);
  });

  it('one or two attempts is not "weak" — it takes a real sample', () => {
    const r = rankThemeTargets([], [{ theme: 'fork', accuracy: 0, attempts: 1 }], ['fork'], 0, 3);
    expect(r).toEqual([]);
  });

  it('a new student meets EVERY theme over time, not the same first three', () => {
    const seen = new Set<string>();
    for (let n = 0; n < ALL.length; n += 1) for (const t of rankThemeTargets([], [], ALL, n, 1)) seen.add(t);
    expect(seen.size).toBe(ALL.length);
  });

  it('rotation is stable, never random', () => {
    expect(rankThemeTargets([], [], ALL, 7, 3)).toEqual(rankThemeTargets([], [], ALL, 7, 3));
  });
});
