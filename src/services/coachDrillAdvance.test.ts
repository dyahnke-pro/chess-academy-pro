import { describe, it, expect } from 'vitest';
import { advanceMistakeDrill, type DrillProgress, type MistakeDrillTheme } from './coachDrillService';

/** Minimal theme with N throwaway drills (only structure matters here). */
function theme(key: string, label: string, n: number): MistakeDrillTheme {
  const drills = Array.from({ length: n }, (_, i) => ({
    aid: `mistake:${key}`, label, setupFen: 'x', playerColor: 'white' as const,
    solutionSan: ['a'], prompt: 'p', puzzleId: `${key}-${i}`, rating: 1200,
  }));
  return { key, label, count: n, drills };
}

const QUEUE = [theme('tactic:fork', 'Forks', 3), theme('phase:endgame', 'Endgame', 2)];
const start = (): DrillProgress => ({ queue: QUEUE, themeIdx: 0, puzzleIdx: 0 });

describe('advanceMistakeDrill — walk this session\'s due queue', () => {
  it('serves the next due mistake in the theme', () => {
    const a = advanceMistakeDrill(start());
    expect(a.done).toBe(false);
    expect(a.themeCompleted).toBe(false);
    expect(a.next!.progress.puzzleIdx).toBe(1);
    expect(a.next!.drill.puzzleId).toBe('tactic:fork-1');
  });

  it('moves to the next weakness when the theme\'s due mistakes are done', () => {
    // Forks theme has 3; start at its last (puzzleIdx 2).
    const p: DrillProgress = { queue: QUEUE, themeIdx: 0, puzzleIdx: 2 };
    const a = advanceMistakeDrill(p);
    expect(a.themeCompleted).toBe(true);
    expect(a.done).toBe(false);
    expect(a.completedLabel).toBe('Forks');
    expect(a.nextLabel).toBe('Endgame');
    expect(a.next!.drill.puzzleId).toBe('phase:endgame-0');
    expect(a.next!.progress).toEqual({ queue: QUEUE, themeIdx: 1, puzzleIdx: 0 });
  });

  it('is done when the last theme\'s due mistakes are worked', () => {
    const p: DrillProgress = { queue: QUEUE, themeIdx: 1, puzzleIdx: 1 }; // endgame last
    const a = advanceMistakeDrill(p);
    expect(a.done).toBe(true);
    expect(a.themeCompleted).toBe(true);
    expect(a.completedLabel).toBe('Endgame');
    expect(a.next).toBeUndefined();
  });

  it('walks the whole queue end-to-end (fork×3 → endgame×2)', () => {
    let p = start();
    const seen: string[] = [QUEUE[0].drills[0].puzzleId];
    for (let guard = 0; guard < 10; guard += 1) {
      const a = advanceMistakeDrill(p);
      if (a.done) break;
      seen.push(a.next!.drill.puzzleId);
      p = a.next!.progress;
    }
    expect(seen).toEqual([
      'tactic:fork-0', 'tactic:fork-1', 'tactic:fork-2',
      'phase:endgame-0', 'phase:endgame-1',
    ]);
  });
});
