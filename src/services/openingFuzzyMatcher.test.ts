import { describe, it, expect } from 'vitest';
import { fuzzyMatchOpening } from './openingFuzzyMatcher';

describe('fuzzyMatchOpening', () => {
  it('exact canonical name → autoAccept via resolveOpeningEntry', () => {
    const r = fuzzyMatchOpening('Philidor Defense');
    expect(r.autoAccept).toBe(true);
    expect(r.candidates[0].canonicalName).toMatch(/Philidor/);
    expect(r.candidates[0].source).toBe('resolveOpeningEntry');
  });

  // Regression (David 2026-07-18): "coach can't teach the KIA with the white
  // pieces." The NAME_ALIASES lookup is a whole-string exact match, so trailing
  // "with white pieces" / leading "teach me the" made the "KIA" acronym fail to
  // resolve and the fuzzy scan mis-grabbed "King's Indian" (the Defence).
  it.each([
    'KIA with white pieces',
    'Teach me the KIA with white pieces',
    'the KIA with white pieces',
    "King's Indian Attack with white",
  ])('intent filler + side qualifier stripped: "%s" → King\'s Indian Attack', (q) => {
    const r = fuzzyMatchOpening(q);
    expect(r.autoAccept).toBe(true);
    expect(r.candidates[0].canonicalName).toBe("King's Indian Attack");
  });

  it('side qualifier does not derail a normal Defence name', () => {
    // "King's Indian Defense" must stay the Defence, not get stripped oddly.
    expect(fuzzyMatchOpening("King's Indian Defense").candidates[0].canonicalName).toMatch(
      /King's Indian Defense/,
    );
  });

  it("British spelling ('Defence') resolves and auto-accepts", () => {
    // WHAT THIS GUARDS is the 2026-05-19 incident: David typed "Philidor
    // Defence" and got bounced. The contract is that the British spelling
    // reaches the right opening without a picker — that is what a student
    // experiences, and it still holds.
    //
    // It previously also asserted `source === 'british-normalized'`, naming
    // WHICH tier did the work, and had been failing (before and independent of
    // any change in this file) because `resolveOpeningEntry` has since learned
    // British spellings and now answers at tier 1. Same opening, same
    // auto-accept, one hop earlier — strictly better, and the test was red for
    // an improvement.
    //
    // Probed 17 British forms on 2026-08-08 — every "Defence", "Centre Game",
    // "Centre Counter", "Petrov/Owen/Hungarian Defence" — and all resolve at
    // tier 1, so the `british-normalized` tier now appears UNREACHABLE. It is
    // left in place as a backstop rather than deleted: the locked rule is to
    // prove code is dead before removing it, and "I could not reach it from
    // outside" is not that proof.
    const r = fuzzyMatchOpening('Philidor Defence');
    expect(r.autoAccept).toBe(true);
    expect(r.candidates[0].canonicalName).toMatch(/Philidor Defense/);
  });

  it('the whole British-spelling class reaches its opening', () => {
    // Breadth the single Philidor case never had. Asserting the outcome rather
    // than the tier means this keeps working whichever layer handles it.
    for (const q of ['Sicilian Defence', 'French Defence', 'Caro-Kann Defence', 'Pirc Defence', 'Centre Game']) {
      const r = fuzzyMatchOpening(q);
      expect(r.autoAccept, q).toBe(true);
      expect(r.candidates[0]?.canonicalName, q).toBeTruthy();
    }
  });

  it("British 'Centre Counter' rewrites to 'Center Counter'", () => {
    const r = fuzzyMatchOpening('Scandinavian Defense Centre Counter');
    // Whether this hits a DB entry depends on the DB content; we just
    // assert the rewrite path was tried (no fuzzy-distance fallback
    // for a string that contains British 'centre').
    expect(r.candidates[0]?.source ?? 'fuzzy-distance').not.toBe(
      'resolveOpeningEntry',
    );
  });

  it("typo 'Najdorff' → fuzzy candidates including Najdorf", () => {
    const r = fuzzyMatchOpening('Najdorff');
    const names = r.candidates.map((c) => c.canonicalName.toLowerCase());
    expect(names.some((n) => n.includes('najdorf'))).toBe(true);
  });

  it("missing letter 'Caro Cann' → Caro-Kann surfaces", () => {
    const r = fuzzyMatchOpening('Caro Cann');
    const names = r.candidates.map((c) => c.canonicalName.toLowerCase());
    expect(names.some((n) => n.includes('caro-kann'))).toBe(true);
  });

  it("ambiguous short input 'sicilian' returns multiple candidates without autoAccept", () => {
    const r = fuzzyMatchOpening('sicilian');
    // 'sicilian' as a query SHOULD resolve directly via resolveOpeningEntry
    // (it has a parent 'Sicilian Defense' entry). So autoAccept can be true.
    // The important check: SOME candidate names contain 'sicilian'.
    const names = r.candidates.map((c) => c.canonicalName.toLowerCase());
    expect(names.some((n) => n.includes('sicilian'))).toBe(true);
  });

  it('garbage input returns empty candidates, autoAccept=false', () => {
    const r = fuzzyMatchOpening('asdfghjklqwertyuiop');
    expect(r.autoAccept).toBe(false);
    expect(r.candidates).toEqual([]);
  });

  it('empty input returns empty candidates without crashing', () => {
    const r = fuzzyMatchOpening('');
    expect(r.autoAccept).toBe(false);
    expect(r.candidates).toEqual([]);
    expect(r.query).toBe('');
  });

  it('trims whitespace', () => {
    const r = fuzzyMatchOpening('  Philidor Defense  ');
    expect(r.autoAccept).toBe(true);
    expect(r.query).toBe('Philidor Defense');
  });

  describe('Bug C regression — picker quality on live-audit failure modes', () => {
    it('"Danish Gambit" canonical parent surfaces (was hidden by ply-count filter)', () => {
      // Live audit 2026-05-19: typing "I wanted the danish gambit"
      // surfaced 4 picker options — none of which was the canonical
      // bare "Danish Gambit" — because the old TEACHABLE filter
      // excluded entries below 8 plies without a colon, and the
      // bare entry is 5 plies. The fix switches to isTeachable
      // (which keeps any entry with DB sub-variations).
      const r = fuzzyMatchOpening('Danish Gambit');
      const names = r.candidates.map((c) => c.canonicalName);
      // The canonical parent should resolve directly via the
      // resolveOpeningEntry tier (autoAccept).
      expect(r.autoAccept).toBe(true);
      expect(names[0]).toBe('Danish Gambit');
    });

    it('"I wanted the danish gambit" does NOT rank Sicilian Smith-Morra above Danish entries', () => {
      // Live audit 2026-05-19 (Bug C): the same prompt as above
      // typed conversationally surfaced "Sicilian Defense: Smith-
      // Morra Gambit Accepted, Danish Variation" as one of 4
      // options, alongside three Danish Gambit Accepted sub-
      // variations and NO bare "Danish Gambit." The fix: F1 token
      // scoring penalizes candidates whose extra tokens don't
      // match the query.
      const r = fuzzyMatchOpening('I wanted the danish gambit');
      const danishIdx = r.candidates.findIndex((c) =>
        /^Danish Gambit/.test(c.canonicalName),
      );
      const smithMorraIdx = r.candidates.findIndex((c) =>
        /Sicilian.*Smith-Morra/i.test(c.canonicalName),
      );
      // The Danish entry MUST come before the Sicilian entry (if the
      // Sicilian entry surfaces at all). Either:
      //   - Sicilian is filtered out entirely (smithMorraIdx === -1), OR
      //   - Danish is ranked higher (danishIdx < smithMorraIdx).
      if (smithMorraIdx !== -1) {
        expect(danishIdx).toBeGreaterThanOrEqual(0);
        expect(danishIdx).toBeLessThan(smithMorraIdx);
      } else {
        // Sicilian Smith-Morra correctly filtered as off-family.
        expect(danishIdx).toBeGreaterThanOrEqual(0);
      }
    });

    it('"traps first" does NOT surface "First Jaenisch Variation" as a confident match', () => {
      // Live audit 2026-05-19: tapping the chip "Show me the traps
      // first" while on a Danish Gambit context surfaced "King's
      // Gambit Accepted: Bishop's Gambit, First Jaenisch Variation"
      // because "first" exact-matched and the 2-token query's
      // single weak token ("traps") didn't drag the score below
      // the floor. With F1 scoring, the candidate's 8 unmatched
      // tokens crater precision and the score falls below floor.
      const r = fuzzyMatchOpening('traps first');
      const jaeniscIdx = r.candidates.findIndex((c) =>
        /Jaenisch/i.test(c.canonicalName),
      );
      // Acceptable outcomes: empty candidates (best), or the
      // Jaenisch entry isn't in the surfaced set at all. NOT
      // acceptable: Jaenisch as a top suggestion.
      expect(jaeniscIdx).toBe(-1);
    });
  });

  describe('matchup + acronym (David 2026-07-18 screenshot)', () => {
    it('"KIA" resolves to King\'s Indian Attack (acronym alias)', () => {
      const r = fuzzyMatchOpening('KIA');
      expect(r.autoAccept).toBe(true);
      expect(r.candidates[0]?.canonicalName).toBe("King's Indian Attack");
    });

    it('"the KIA" resolves too (leading article stripped)', () => {
      const r = fuzzyMatchOpening('the KIA');
      expect(r.candidates[0]?.canonicalName).toBe("King's Indian Attack");
    });

    it('"KIA vs Sicilian dragon" offers BOTH sides — student\'s system first', () => {
      // The bug: the whole-string scan drowned the "KIA" token and
      // surfaced four Sicilian Dragon rows, never the King's Indian
      // Attack. Now the matchup splits and offers both, KIA first.
      const r = fuzzyMatchOpening('KIA vs Sicilian dragon');
      const names = r.candidates.map((c) => c.canonicalName);
      expect(names).toContain("King's Indian Attack");
      expect(names.some((n) => /Dragon/i.test(n))).toBe(true);
      expect(names[0]).toBe("King's Indian Attack");
      // A matchup is inherently a "which did you mean?" — never auto-accept.
      expect(r.autoAccept).toBe(false);
    });

    it('handles "versus" and "against" separators', () => {
      expect(fuzzyMatchOpening('Italian versus Petroff').candidates.map((c) => c.canonicalName))
        .toEqual(expect.arrayContaining(['Italian Game', "Petrov's Defense"]));
      expect(fuzzyMatchOpening('London against the KID').candidates.map((c) => c.canonicalName))
        .toEqual(expect.arrayContaining(['London System', "King's Indian Defense"]));
    });

    it('a plain opening name (no separator) is untouched', () => {
      const r = fuzzyMatchOpening('Sicilian Defense');
      expect(r.autoAccept).toBe(true);
      expect(r.candidates[0]?.canonicalName).toBe('Sicilian Defense');
    });
  });
});

// David 2026-08-08, from a live run: he typed "Play the Vienna gambit against
// me", got "I don't have an exact match" and a picker containing ONE option —
// the very opening he named, scored 1.00 by resolveOpeningEntry.
//
// The matchup splitter fired on "against" and took "me" as the second opening.
// Matchups never auto-accept, correctly, because "French vs the Advance" really
// is a which-did-you-mean. An opponent PRONOUN is the opposite: it names who is
// playing, and "play X against me" is the most natural way to ask for a game.
describe('"against me" is a request, not a matchup', () => {
  it('THE REGRESSION: auto-accepts the opening the student named', () => {
    const m = fuzzyMatchOpening('Play the Vienna gambit against me');
    expect(m.candidates[0]?.canonicalName).toBe('Vienna Game: Vienna Gambit');
    expect(m.autoAccept).toBe(true);
  });

  it('covers the other ways a student phrases it', () => {
    for (const q of ['play the Caro-Kann against me', "let's play the Italian versus me", 'play the London against the computer']) {
      expect(fuzzyMatchOpening(q).autoAccept, q).toBe(true);
    }
  });

  it('a REAL matchup still surfaces the picker', () => {
    // Two openings named — the student has to say which side they want.
    expect(fuzzyMatchOpening('French Defense against the Advance').autoAccept).toBe(false);
  });
});
