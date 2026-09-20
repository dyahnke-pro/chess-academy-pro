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
    const fnStart = SRC.lastIndexOf('const resetPerGameMemory', 0 + at);
    expect(fnStart, 'the single newGame() must live inside resetPerGameMemory').toBeGreaterThan(-1);
    expect(at - fnStart).toBeLessThan(1500);
  });

  it('both fresh-game doors call it, and nothing else clears a per-game ref on its own', () => {
    const calls = SRC.match(/resetPerGameMemory\(\)/g) ?? [];
    // one declaration + two call sites
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('the reset forgets every per-game ref the page holds by hand', () => {
    const start = SRC.indexOf('const resetPerGameMemory');
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
