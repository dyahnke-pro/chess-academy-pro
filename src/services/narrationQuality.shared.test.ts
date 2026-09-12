import { describe, it, expect } from 'vitest';
import { classifyClause, teachesChess, namedPerson, scoreNarration, PRED_RE } from './narrationQuality.shared.mjs';

// ── CORPUS SWEEP DETECTOR GATE (David 2026-09-12) ────────────────────────────
//
// The classifier decides which narration clauses get DELETED from the shipped
// corpus. A silent regression here does not throw and does not look wrong — it
// just deletes teaching, and the report still reads clean. That already
// happened once: six predicate stems were written inside `\b...\b`
// (`\bdevelop\b` cannot match "developed"), the teaching guard ran at half
// strength, and the sweep proposed cutting 555 clauses of real chess while
// reporting a tidy result. It was caught only because David hand-checked two
// lines out of 11,210.
//
// So his calls are pinned here. Every fixture below is a clause he personally
// ruled on, verbatim. Edit the patterns freely — but if an edit moves one of
// these, the build fails instead of the corpus quietly shrinking.

describe('corpus sweep — David 2026-09-12 adjudicated fixtures', () => {
  const CUT: ReadonlyArray<readonly [string, string]> = [
    ['The comedy would be if Black declined it.', 'author'],
    ["Do you know the move I'm implying?", 'audience'],
    ['A must-win game against a strong junior.', 'session'],
    ["Kusha knows this line very well; let's try to take him out of theory.", 'namedPerson'],
  ];
  const KEEP: readonly string[] = [
    'The position is balanced and rich — both sides fully developed, no weaknesses yet.',
    'Some sacrifices are so typical you can trust them intuitively.',
  ];

  it.each(CUT)('cuts %j as %s', (clause, klass) => {
    const r = classifyClause(clause);
    expect(r.disposition).toBe('cut');
    expect(r.class).toBe(klass);
  });

  it.each(KEEP)('keeps %j', (clause) => {
    expect(classifyClause(clause).disposition).toBe('keep');
  });
});

describe('corpus sweep — the lines from the Accelerated Dragon run', () => {
  // What David actually heard on /coach/teach, 2026-09-12.
  it.each([
    ["We're Black against a 2050 — this is going to be juicy.", 'rating'],
    ['White recaptures with the knight — music to my ears.', 'author'],
  ])('cuts %j as %s', (clause, klass) => {
    const r = classifyClause(clause);
    expect(r.disposition).toBe('cut');
    expect(r.class).toBe(klass);
  });

  it('keeps the teaching that lost the selection contest at the same ply', () => {
    expect(
      classifyClause(
        'We capture on d4, conceding a share of the centre for quick development and an open c-file to lean on later.',
      ).disposition,
    ).toBe('keep');
  });
});

describe('corpus sweep — the teaching guard vetoes every cut', () => {
  it('keeps a chatter-matching clause that still teaches', () => {
    // Matches `session` on "this game", but names squares and predicates chess.
    const c = 'In this game the knight on d5 is an outpost no pawn can ever challenge.';
    expect(teachesChess(c)).toBe(true);
    expect(classifyClause(c).disposition).toBe('keep');
  });

  it('never cut a clause the guard protects', () => {
    for (const c of [
      'Now we castle long, completing our development',
      'the bishop settles on g7, aimed down the long diagonal at the centre',
    ]) {
      expect(classifyClause(c).disposition).toBe('keep');
    }
  });
});

describe('corpus sweep — predicate stems must match suffixed words', () => {
  // THE REGRESSION THAT SHIPPED. Each of these is a stem that was previously
  // written as `\bstem\b` and could never match the word it exists to catch.
  it.each([
    ['develop', 'both sides fully developed'],
    ['weak', 'no weaknesses yet'],
    ['sacrific', 'some sacrifices are typical'],
    ['pressur', 'pressuring the backward pawn'],
    ['isolat', 'an isolated queen pawn'],
    ['equali', 'the break equalizes'],
  ])('stem %s matches %j', (_stem, phrase) => {
    expect(PRED_RE.test(phrase)).toBe(true);
  });
});

describe('narration scoring — the Accelerated Dragon ply-2 contest', () => {
  // 61 candidate notes sit at `e4 c5`. `noteAtPosition` ranked them only by
  // "does this note's own opening reach this position", which is INERT on the
  // voiced corpus (every note carries opening: null) — so all 61 tied and file
  // order won. David heard the 2050 line; the opening's own thesis statement was
  // sitting at the same position, unselected. These fixtures pin the ordering.
  const OPENING = 'Sicilian Defense: Accelerated Dragon';

  const THESIS =
    "The reply c5 against the king's-pawn — the Sicilian. Today's choice is the " +
    'Accelerated Dragon, a fast, clean setup and one of the friendliest gateways into ' +
    'the whole Sicilian family: less theory, clearly defined ideas, quick development.';
  const HEARD = "We're Black against a 2050 — this is going to be juicy. The pawn to e4, c5.";
  const MOVE_LIST = 'e4, c5.';
  const CHATTER = 'Our patented Sicilian again.';

  it('ranks the opening thesis above everything else at this ply', () => {
    const thesis = scoreNarration(THESIS, OPENING);
    for (const other of [HEARD, MOVE_LIST, CHATTER]) {
      expect(thesis).toBeGreaterThan(scoreNarration(other, OPENING));
    }
  });

  it('ranks the chatter David heard last', () => {
    expect(scoreNarration(HEARD, OPENING)).toBeLessThan(scoreNarration(MOVE_LIST, OPENING));
    expect(scoreNarration(HEARD, OPENING)).toBeLessThan(0);
  });

  it('never lets a bare move list outrank real teaching', () => {
    // "e4, c5." names two squares, so a board-referent check alone scores it as
    // teaching. It is recitation — the student just watched both moves.
    expect(scoreNarration(MOVE_LIST, OPENING)).toBeLessThan(scoreNarration(THESIS, OPENING));
    expect(scoreNarration('The knight to f3.', OPENING)).toBeLessThan(0);
  });
});

describe('narration scoring — false positives that cost the right answer', () => {
  it('does not read a time word before an apostrophe-s as a person', () => {
    // "Today's choice is the Accelerated Dragon" was classified namedPerson and
    // penalised -6, which is what knocked the thesis out of first place.
    // The clause as it actually appears in the corpus. (A truncation of it IS a
    // fragment — no square, no chess idea — so the fixture must be the real text.)
    const REAL =
      "Today's choice is the Accelerated Dragon, a fast, clean setup and one of the " +
      'friendliest gateways into the whole Sicilian family: less theory, clearly ' +
      'defined ideas, quick development.';
    expect(namedPerson(REAL)).toBeNull();
    expect(classifyClause(REAL).disposition).toBe('keep');
  });

  it('still catches a real person by their verb', () => {
    expect(namedPerson("Kusha knows this line very well; let's take him out of theory.")).toBe('Kusha');
  });

  it('scores an opening thesis even when the note omits the taxonomy word', () => {
    // No teaching note spells out "Sicilian DEFENSE"; requiring every word of
    // the opening name scored the thesis at zero for its own opening.
    expect(scoreNarration('A clean setup in the Accelerated Dragon, quick development.', 'Sicilian Defense: Accelerated Dragon'))
      .toBeGreaterThan(scoreNarration('A clean setup, quick development.', 'Sicilian Defense: Accelerated Dragon'));
  });
});
