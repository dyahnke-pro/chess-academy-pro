// 🔒 ONE FRESH-GAME RESET, BOTH DOORS (2026-09-20).
//
// A new Learn game arrives two ways — the student ASKS for one, or the BOARD
// returns to the start — and the two sites listed DIFFERENT subsets of the
// per-game refs. Measured on prod: the ask-door left `fundamentalSeenRef`
// holding game 1's fundamentals, so game 2 spoke NO first-time verdict across
// 17 plies and the recurrence clause, which rides that verdict, could never
// attach. The list is the debt; this gate makes a second list impossible.
//
// Blamed by STATEMENT: every `learnMemRef.current.newGame()` must be inside the
// one reset function, and every fresh-game site must call that function.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');

describe('CoachTeachPage — one fresh-game reset', () => {
  it('newGame() is called in exactly ONE place: the shared reset', () => {
    const calls = SRC.match(/learnMemRef\.current\.newGame\(\)/g) ?? [];
    expect(calls.length, 'a second newGame() call site means a second list of refs to forget').toBe(1);
    const at = SRC.indexOf('learnMemRef.current.newGame()');
    const fnStart = SRC.lastIndexOf('const resetPerGameMemory', at);
    expect(fnStart, 'the single newGame() must live inside resetPerGameMemory').toBeGreaterThan(-1);
    expect(at - fnStart).toBeLessThan(1500);
  });

  it('both fresh-game doors call it, and nothing else clears a per-game ref on its own', () => {
    const calls = SRC.match(/resetPerGameMemory\(\)/g) ?? [];
    // one declaration + two call sites
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  // THE THIRD DOOR (2026-09-20). `learnMemory.observe()` resets ITSELF when the
  // board goes backwards — a path no caller goes through — so the page's hand
  // refs only follow if the memory OWNS the signal. Blamed by statement: the
  // memory must be created with the callback, and `newGame()` must fire it.
  it('the memory owns the fresh-game signal, so observe()\'s own reset reaches the page refs', () => {
    expect(SRC).toMatch(/createLearnMemory\(\(\) => \{ forgetPageRefsRef\.current\(\); \}\)/);
    const mem = readFileSync('src/services/learnMemory.ts', 'utf8');
    expect(mem).toMatch(/createLearnMemory\(onNewGame\?: \(\) => void\)/);
    const ng = mem.indexOf('newGame(): void {');
    expect(mem.slice(ng, mem.indexOf('\n    },', ng)), 'newGame must fire onNewGame').toContain('onNewGame?.()');
    const obs = mem.indexOf('observe(plies: number): boolean {');
    expect(mem.slice(obs, obs + 240), 'observe must go through newGame, never clear fields itself').toContain('mem.newGame()');
  });

  it('the page-ref forgetter never calls newGame (that would recurse through onNewGame)', () => {
    const start = SRC.indexOf('const forgetPageRefs = useCallback');
    const body = SRC.slice(start, SRC.indexOf('}, []);', start));
    expect(body).not.toContain('newGame');
  });

  it('the reset forgets every per-game ref the page holds by hand', () => {
    const start = SRC.indexOf('const forgetPageRefs = useCallback');
    const body = SRC.slice(start, SRC.indexOf('}, []);', start));
    for (const ref of [
      'announcedPliesRef', 'announcedTrapsRef', 'teachNoteSeenIdsRef', 'fundamentalSeenRef',
      'planSaidRef', 'positionalSaidRef', 'forkTalkCountRef', 'pendingForkRef',
      'rejectedTemptingCountRef', 'priorityFirstLastPlyRef',
    ]) {
      expect(body, `${ref} is not forgotten on a fresh game`).toContain(ref);
    }
  });
});
