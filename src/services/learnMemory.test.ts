import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createLearnMemory, markOpeningFactsSpoken, NEVER_FIRED, type LearnMemory } from './learnMemory';

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
  // One engine read of ONE board, matched by FEN before use — per turn.
  studentBestReadRef: 'per-turn engine read, keyed by its FEN — not per game',
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
    const mem = createLearnMemory({ livePlies: () => 0 });
    // Fill every slot by its declared shape, so a slot ADDED later is filled
    // here too without editing this test — and then caught if newGame() skips
    // it. This is the whole point of the object: you cannot add a memory and
    // forget to forget it.
    // Filter METHODS by type, not by name: a second method (observe) was added
    // and a name-based filter flagged it as an unforgotten slot. Any new DATA
    // slot is still caught, which is the point.
    // `gameId` is IDENTITY, not say-once memory: `newGame()` must REPLACE it,
    // not empty it, so the "cleared to null/''" rule below is the wrong
    // question for it. It gets a stronger assertion of its own in the next
    // test — a new game must mint a new id — which is why excluding it here
    // does not create a hole. Named explicitly so a future slot cannot ride
    // out on a vague filter.
    const IDENTITY_SLOTS = new Set<string>(['gameId']);
    const slots = (Object.keys(mem) as Array<keyof LearnMemory>)
      .filter((k) => typeof mem[k] !== 'function' && !IDENTITY_SLOTS.has(k));
    expect(slots.length).toBeGreaterThan(5);
    for (const k of slots) {
      const v = mem[k];
      if (v instanceof Set) v.add('x');
      else if (v instanceof Map) (v as Map<string, unknown>).set('x', 1);
      else if (typeof v === 'number') (mem as unknown as Record<string, unknown>)[k] = 42;
      else (mem as unknown as Record<string, unknown>)[k] = 'x';
    }
    // Every slot is now dirty.
    for (const k of slots) {
      const v: unknown = mem[k];
      const dirty = v instanceof Set || v instanceof Map ? v.size > 0 : v !== null && v !== '' && v !== NEVER_FIRED;
      expect(dirty, `slot ${k} could not be dirtied — widen this test`).toBe(true);
    }

    mem.newGame();

    for (const k of slots) {
      const v: unknown = mem[k];
      const clean = v instanceof Set || v instanceof Map
        ? v.size === 0
        : v === null || v === '' || v === NEVER_FIRED;
      expect(clean, `newGame() did not forget "${k}" — add it to newGame()`).toBe(true);
    }
  });

  it('newGame() mints a NEW gameId — game 2 cannot record against game 1', () => {
    const mem = createLearnMemory({ livePlies: () => 0 });
    const first = mem.gameId;
    expect(first).toMatch(/^teach-/);

    mem.newGame();
    expect(mem.gameId).not.toBe(first);
    expect(mem.gameId).toMatch(/^teach-/);
  });

  /** A stand-in for the live board: `observe()` reads it, nobody hands it a number. */
  function onBoard(): { mem: LearnMemory; set: (plies: number) => void } {
    let plies = 0;
    return { mem: createLearnMemory({ livePlies: () => plies }), set: (n) => { plies = n; } };
  }

  it('a REWIND mints a new gameId too — the board decides, not a call site', () => {
    // `observe` is the reset that cannot be fooled by which code path reached
    // the board. The id has to follow it, or a second game played by the path
    // neither hand-placed reset covers files its slips under the first game.
    const { mem, set } = onBoard();
    set(14); mem.observe();
    const first = mem.gameId;
    set(2);
    expect(mem.observe()).toBe(true);          // board went backwards
    expect(mem.gameId).not.toBe(first);
  });

  // Attack round 2026-10-07: a takeback re-announced the opening, re-said every
  // definition and filed the rest of the game under a second id.
  it('a TAKEBACK keeps the memory and the game id (rewind, then observe)', () => {
    const { mem, set } = onBoard();
    set(14); mem.observe();
    mem.spokenOpeningName = 'Scandinavian Defense';
    const id = mem.gameId;
    mem.rewind(12);                              // took two plies back
    set(12); expect(mem.observe()).toBe(false);
    set(13); expect(mem.observe()).toBe(false);
    expect(mem.spokenOpeningName).toBe('Scandinavian Defense');
    expect(mem.gameId).toBe(id);
    // …and a real new game still resets.
    set(1); expect(mem.observe()).toBe(true);
    expect(mem.gameId).not.toBe(id);
  });

  it('observe() forgets when the board goes BACKWARDS — a second game', () => {
    const { mem, set } = onBoard();
    mem.spokenOpeningName = 'Scandinavian Defense: Lasker Variation';
    mem.detectedOpeningName = 'Scandinavian Defense: Lasker Variation';
    set(14); expect(mem.observe(), 'a game in progress must not forget').toBe(false);
    set(16); expect(mem.observe()).toBe(false);
    // A NEW game: the board is back near the start.
    set(1); expect(mem.observe(), 'fewer plies than before = a new or rewound game').toBe(true);
    expect(mem.spokenOpeningName).toBeNull();
    expect(mem.detectedOpeningName).toBeNull();
  });

  // GATE-1 AUDIT 2026-10-21: every Campaign game on prod was filed under three
  // ids. The instant wave of an EARLIER turn ran after the student's next move
  // (it waits out the verdict) and reported its own, shorter history — which the
  // old `observe(plies)` read as the board going backwards. The order below is
  // that race: turn 12's wave observes after turn 14's. The live board says 14
  // both times, so the game keeps its id.
  it('a LATE turn cannot split the game: observe reads the live board, not the turn', () => {
    const { mem, set } = onBoard();
    set(12); mem.observe();
    const id = mem.gameId;
    set(14); mem.observe();                      // the next turn's wave
    expect(mem.observe(), 'the earlier turn\'s late wave').toBe(false);
    expect(mem.gameId).toBe(id);
    expect(mem.observe.length, 'observe takes no ply count — a stale one cannot be passed').toBe(0);
  });

  // ── R1 OF THE ARC: QUEUEING IS NOT SAYING (2026-09-18) ──────────────────
  //
  // Measured on prod: game 2's opening was COMPUTED five times and SPOKEN zero.
  // The announcement marked itself announced the instant it was queued, then had
  // to survive a delivery path that discarded the whole queue whenever the
  // instant package had said anything substantive. Flag spent, line dropped, and
  // the fallback site guarded on the same flag so it could never fire either.
  //
  // These two tests hold the shape of the fix, not the symptom: ONE field may not
  // mean both "what we detected" and "what we said", and only real delivery may
  // spend the second one.

  it('the announce site does NOT mark the name spoken — only delivery does', () => {
    const src = readFileSync(PAGE, 'utf8');
    const announce = src.slice(src.indexOf('── OPENING ANNOUNCEMENT'));
    const body = announce.slice(0, announce.indexOf('captureEvent('));
    expect(
      /spokenOpeningName\s*=(?!=)/.test(body),
      'the announcement must not spend the say-once flag before the voice has it',
    ).toBe(false);
    expect(
      /detectedOpeningName\s*=\s*det\.name/.test(body),
      'detection is still recorded immediately — it is context, not an utterance',
    ).toBe(true);
  });

  it('spokenOpeningName is written only where an `opening` fact actually survived', () => {
    // Both packages can carry the name, so both promote it — through ONE
    // helper fed what the package KEPT (2026-10-14), which writes only on an
    // `opening` fact. No inline write remains on the page.
    const src = readFileSync(PAGE, 'utf8');
    expect(src.split("\n").filter((l) => /learnMemRef\.current\.spokenOpeningName\s*=(?!=)/.test(l))).toEqual([]);
    // One page helper (`noteOpeningFactsHeard`) marks and counts what was heard.
    expect(src).toMatch(/noteOpeningFactsHeard\(instant\.pkg\.kept\)/);
    expect(src).toMatch(/noteOpeningFactsHeard\(hintPkg\.kept\)/);
    expect(src.match(/markOpeningFactsSpoken\(learnMemRef\.current, kept\)/g) ?? []).toHaveLength(1);
    const mem = createLearnMemory({ livePlies: () => 0 });
    mem.detectedOpeningName = 'Scandinavian Defense';
    markOpeningFactsSpoken(mem, [{ kind: 'computed' }]);
    expect(mem.spokenOpeningName).toBeNull();
    markOpeningFactsSpoken(mem, [{ kind: 'opening' }]);
    expect(mem.spokenOpeningName).toBe('Scandinavian Defense');
  });

  it('the note-primary stand-down fires on a NOTE, not on any substantive fact', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(
      /noteTaughtThisTurn = true/.test(src),
      'the flag keeps its name',
    ).toBe(true);
    const at = src.indexOf('noteTaughtThisTurn = true');
    const guard = src.slice(Math.max(0, at - 300), at);
    expect(
      /kind === 'note'/.test(guard),
      "David's rule is note-scoped; a broader test discards the whole late queue "
      + 'on most turns, which is the code-side cut G4.5 bans',
    ).toBe(true);
    expect(
      src.includes("f.kind !== 'threat' && f.kind !== 'tactic'"),
      'the old any-substantive-fact test must be gone, not merely renamed',
    ).toBe(false);
  });

  it('the per-ply observe is wired into the page — not just the two intent sites', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(
      /learnMemRef\.current\.observe\(/.test(src),
      'the board-driven forget is what makes the reset path-independent',
    ).toBe(true);
  });


  // 🔄 REWRITTEN 2026-09-20, and the old assertion is DELETED rather than
  // annotated. It read "newGame() is called at EVERY fresh-game site
  // (>= 2 calls)", which encoded a design where each site carried its own list
  // of refs to forget — and those lists DRIFTED: the ask-door cleared two, the
  // board-door eight, so a session's second game could inherit the first's
  // fundamentals. There is ONE door now (`resetPerGameMemory`) and the memory
  // itself owns the signal, so counting `newGame()` call sites would now demand
  // the very duplication that caused the bug. The shape is gated in full by
  // `src/test/oneFreshGameReset.test.ts`; this asserts the half that belongs
  // to the memory.
  it('the Learn page routes every fresh game through ONE reset, and the memory owns the signal', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src.match(/learnMemRef\.current\.newGame\(\)/g) ?? [], 'exactly one newGame() call site').toHaveLength(1);
    expect((src.match(/resetPerGameMemory\(\)/g) ?? []).length, 'the ask door goes through it (the board door is observe())').toBeGreaterThanOrEqual(1);
    // …and it counts the LIVE board (`plies`), never the render snapshot
    // (`history`), which still holds the old game right after a scenario
    // board replaces it (prod gate 2026-10-21: a second game id).
    expect(src, 'the memory fires the page-ref forgetter on EVERY reset, including observe()\'s own')
      .toMatch(/createLearnMemory\(\{ livePlies: \(\) => gameRef\.current\.plies, onNewGame: \(\) => \{ forgetPageRefsRef\.current\(\); \} \}\)/);
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
    expect(declared).toContain('positionalSaidRef');
  });
});

describe('queueing is not saying — opening facts are marked from the voice (2026-10-14)', () => {
  it('a HELD identity stays unsaid; a SPOKEN one is marked', () => {
    const mem = createLearnMemory({ livePlies: () => 0 });
    markOpeningFactsSpoken(mem, [{ kind: 'computed', claims: ['threat:e5'] }]);
    expect(mem.identitySaid).toBeNull();
    markOpeningFactsSpoken(mem, [{ kind: 'computed', claims: ['opening-identity:Scandinavian Defense'] }]);
    expect(mem.identitySaid).toBe('opening-identity:Scandinavian Defense');
  });
  it('Learn no longer marks the identity or the plan at queue time', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).not.toMatch(/identityQueued/);
  });
  it('the NAME carries its identity in one line, and hearing it marks both (2026-10-14)', () => {
    const mem = createLearnMemory({ livePlies: () => 0 });
    mem.detectedOpeningName = 'Scandinavian Defense';
    markOpeningFactsSpoken(mem, [{ kind: 'opening', claims: ['opening-name:Scandinavian Defense', 'opening-identity:Scandinavian Defense'] }]);
    expect(mem.spokenOpeningName).toBe('Scandinavian Defense');
    expect(mem.identitySaid).toBe('opening-identity:Scandinavian Defense');
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).toMatch(/announceLine = `\$\{announce\} \$\{idWith\.text\}`/);
    expect(src).toMatch(/claims: announceClaims/);
    // The identity that rode the name is not offered again (the story's read).
    expect(src).toMatch(/identityRidesName && r\.storyBeat === 'identity'/);
  });
});

describe('reason wordings rotate per game, not per move number (David 2026-10-14)', () => {
  it('three alerts get three stems, and a new game starts over', async () => {
    const { createLearnMemory, nextStem } = await import('./learnMemory');
    const m = createLearnMemory({ livePlies: () => 0 });
    expect([nextStem(m, 'hanging'), nextStem(m, 'hanging'), nextStem(m, 'hanging')]).toEqual([0, 1, 2]);
    expect(nextStem(m, 'pin')).toBe(0);
    m.newGame();
    expect(nextStem(m, 'hanging')).toBe(0);
  });
});

describe('Learn remembers what SPOKE, never what was offered (prod Learn 2026-10-16)', () => {
  it('a held fact leaves no say-once key; a kept one writes its claims, a one-turn threat never', async () => {
    const { rememberKeptClaims, rememberKeptClauses } = await import('./learnMemory');
    const said: string[] = [];
    rememberKeptClaims([{ claims: ['file-d', 'win-e5'] }], (k) => said.push(k));
    expect(said).toEqual(['file-d']);
    const byClause = [
      { text: 'They keep moving the same piece twice.', keys: ['They keep moving the same piece twice.'] },
      { text: 'How do you find a plan?', keys: ['method:plan'] },
    ];
    const kept: string[] = [];
    // Only the habit clause spoke; the method clause was held.
    rememberKeptClauses([{ text: 'They keep moving the same piece twice.' }], byClause, (k) => kept.push(k));
    expect(kept).toEqual(['They keep moving the same piece twice.']);
  });
});
