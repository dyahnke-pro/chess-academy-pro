import { describe, it, expect } from 'vitest';
import { advanceMistakeDrill, DRILL_MASTERY, type DrillProgress, type MistakeDrillTheme } from './coachDrillService';

/** Minimal theme with N throwaway drills (only structure matters here). */
function theme(key: string, label: string, n: number): MistakeDrillTheme {
  const drills = Array.from({ length: n }, (_, i) => ({
    aid: `mistake:${key}`, label, setupFen: 'x', playerColor: 'white' as const,
    solutionSan: ['a'], prompt: 'p', puzzleId: `${key}-${i}`, rating: 1200,
  }));
  return { key, label, count: n, drills };
}

const QUEUE = [theme('tactic:fork', 'Forks', 5), theme('phase:endgame', 'Endgame', 2)];

function start(): DrillProgress {
  return { queue: QUEUE, themeIdx: 0, puzzleIdx: 0, consecutiveCorrect: 0 };
}

describe('advanceMistakeDrill — adaptive tested-out loop', () => {
  it('serves the next puzzle in the theme until mastery', () => {
    const a = advanceMistakeDrill(start()); // 1st correct
    expect(a.done).toBe(false);
    expect(a.testedOut).toBe(false);
    expect(a.next!.progress.consecutiveCorrect).toBe(1);
    expect(a.next!.progress.puzzleIdx).toBe(1);
    expect(a.next!.drill.puzzleId).toBe('tactic:fork-1');
  });

  it('tests out of a theme after MASTERY in a row, then advances to the next', () => {
    let p = start();
    // Solve MASTERY-1 correctly (still in theme).
    for (let i = 0; i < DRILL_MASTERY - 1; i += 1) {
      const a = advanceMistakeDrill(p);
      expect(a.testedOut).toBe(false);
      p = a.next!.progress;
    }
    // The MASTERY-th correct tests out.
    const out = advanceMistakeDrill(p);
    expect(out.testedOut).toBe(true);
    expect(out.done).toBe(false);
    expect(out.testedOutLabel).toBe('Forks');
    expect(out.nextLabel).toBe('Endgame');
    expect(out.next!.drill.puzzleId).toBe('phase:endgame-0');
    expect(out.next!.progress.themeIdx).toBe(1);
    expect(out.next!.progress.consecutiveCorrect).toBe(0);
  });

  it('advances themes when a theme runs out of puzzles (even without mastery streak)', () => {
    // Endgame theme has only 2 puzzles; start on it at puzzleIdx 1 (last).
    const p: DrillProgress = { queue: QUEUE, themeIdx: 1, puzzleIdx: 1, consecutiveCorrect: 0 };
    const a = advanceMistakeDrill(p);
    expect(a.testedOut).toBe(true);
    expect(a.done).toBe(true); // no theme after endgame
    expect(a.testedOutLabel).toBe('Endgame');
  });

  it('reports done when the last theme is tested out', () => {
    const p: DrillProgress = { queue: QUEUE, themeIdx: 1, puzzleIdx: 0, consecutiveCorrect: DRILL_MASTERY - 1 };
    const a = advanceMistakeDrill(p);
    expect(a.done).toBe(true);
    expect(a.testedOut).toBe(true);
  });

  it('a wrong answer (handled by the caller resetting consecutiveCorrect) delays tested-out', () => {
    // Simulate: 2 correct, then the caller resets consecutiveCorrect to 0
    // on a wrong move, so the next correct is only streak 1 — not tested out.
    let p = start();
    p = advanceMistakeDrill(p).next!.progress; // streak 1
    p = advanceMistakeDrill(p).next!.progress; // streak 2
    p = { ...p, consecutiveCorrect: 0 }; // caller reset on a wrong move
    const a = advanceMistakeDrill(p); // streak back to 1
    expect(a.testedOut).toBe(false);
    expect(a.next!.progress.consecutiveCorrect).toBe(1);
  });
});
