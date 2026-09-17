import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createLearnMemory, NEVER_FIRED, type LearnMemory } from './learnMemory';

const PAGE = 'src/components/Coach/CoachTeachPage.tsx';

/** Per-game refs still living OUTSIDE the memory object. SHRINK-ONLY.
 *
 *  Started at 10 (derived, not counted by hand — a first hand census of the
 *  file said 6). Every entry is a coach that goes quiet for the rest of a
 *  session after one mention, so this number only ever goes down. */
const ORPHAN_CEILING = 1;

/** The one deliberate exclusion, with its reason — an allowlist of ONE is
 *  cheaper to read than a rule with an exception buried in prose. */
const NOT_PER_GAME: Record<string, string> = {
  // Scoped to the trap MENU by opening, not to a game: forgetting it would
  // re-offer a trap the coach just taught (the file's own comment says so).
  taughtGemIdsRef: 'trap-menu scope, keyed by opening — not per game',
};

function censusOrphans(): string[] {
  const src = readFileSync(PAGE, 'utf8');
  const declared = [...src.matchAll(/const (\w+Ref) = useRef/g)].map((m) => m[1]);
  const reset = new Set(
    [...src.matchAll(/(\w+Ref)\.current(?:\.clear\(\)|\s*=\s*(?:null|''|0|-999))/g)].map((m) => m[1]),
  );
  return declared
    .filter((r) => /said|seen|announced|last|spoken|taught|count/i.test(r))
    .filter((r) => !reset.has(r));
}

describe('learnMemory — one per-game memory, one newGame()', () => {
  it('newGame() forgets EVERY slot the object holds', () => {
    const mem = createLearnMemory();
    // Fill every slot by its declared shape, so a slot ADDED later is filled
    // here too without editing this test — and then caught if newGame() skips
    // it. This is the whole point of the object: you cannot add a memory and
    // forget to forget it.
    // Filter METHODS by type, not by name: a second method (observe) was added
    // and a name-based filter flagged it as an unforgotten slot. Any new DATA
    // slot is still caught, which is the point.
    const slots = (Object.keys(mem) as Array<keyof LearnMemory>)
      .filter((k) => typeof mem[k] !== 'function');
    expect(slots.length).toBeGreaterThan(5);
    for (const k of slots) {
      const v = mem[k];
      if (v instanceof Set) v.add('x');
      else if (typeof v === 'number') (mem as Record<string, unknown>)[k] = 42;
      else (mem as Record<string, unknown>)[k] = 'x';
    }
    // Every slot is now dirty.
    for (const k of slots) {
      const v = mem[k];
      const dirty = v instanceof Set ? v.size > 0 : v !== null && v !== '' && v !== NEVER_FIRED;
      expect(dirty, `slot ${k} could not be dirtied — widen this test`).toBe(true);
    }

    mem.newGame();

    for (const k of slots) {
      const v = mem[k];
      const clean = v instanceof Set
        ? v.size === 0
        : v === null || v === '' || v === NEVER_FIRED;
      expect(clean, `newGame() did not forget "${k}" — add it to newGame()`).toBe(true);
    }
  });

  it('observe() forgets when the board goes BACKWARDS — a second game', () => {
    const mem = createLearnMemory();
    mem.announcedOpeningName = 'Scandinavian Defense: Lasker Variation';
    mem.curatedBeatSeen.add('beat-1');
    expect(mem.observe(14), 'a game in progress must not forget').toBe(false);
    expect(mem.observe(16)).toBe(false);
    // A NEW game: the board is back near the start.
    expect(mem.observe(1), 'fewer plies than before = a new or rewound game').toBe(true);
    expect(mem.announcedOpeningName).toBeNull();
    expect(mem.curatedBeatSeen.size).toBe(0);
  });

  it('the per-ply observe is wired into the page — not just the two intent sites', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(
      /learnMemRef\.current\.observe\(/.test(src),
      'the board-driven forget is what makes the reset path-independent',
    ).toBe(true);
  });

  it('a think-aloud ply reset reads as "never fired", not as a future ply', () => {
    const mem = createLearnMemory();
    mem.thinkAloudLastPly = 40; // a long game 1
    mem.newGame();
    // Game 2, ply 3, with any sane gap: must be allowed to fire.
    expect(3 - mem.thinkAloudLastPly).toBeGreaterThan(20);
  });

  it('the Learn page calls newGame() at EVERY fresh-game site', () => {
    const src = readFileSync(PAGE, 'utf8');
    const calls = src.match(/learnMemRef\.current\.newGame\(\)/g) ?? [];
    // Two sites today: startOpeningPlay, and the reply handler's history<=2.
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('per-game refs outside the memory object only ever shrink', () => {
    const orphans = censusOrphans();
    const unexplained = orphans.filter((r) => !(r in NOT_PER_GAME));
    expect(
      unexplained,
      'a per-game ref that nothing resets = a coach that goes quiet for the ' +
      'rest of the session. Put it in learnMemory, or name it in NOT_PER_GAME ' +
      'with the reason it is not per-game.',
    ).toEqual([]);
    expect(orphans.length).toBeLessThanOrEqual(ORPHAN_CEILING);
  });

  it('the census is non-vacuous — it can actually see refs', () => {
    const src = readFileSync(PAGE, 'utf8');
    const declared = [...src.matchAll(/const (\w+Ref) = useRef/g)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(30);
    expect(declared).toContain('planSaidRef');
  });
});
