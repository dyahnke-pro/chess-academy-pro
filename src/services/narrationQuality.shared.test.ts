import { describe, it, expect } from 'vitest';
import { classifyClause, teachesChess, namedPerson, scoreNarration, trimPassage, CONFIDENT_CUT_CLASSES, PRED_RE } from './narrationQuality.shared.mjs';

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
  // NB these are PASSAGES, not clauses — each is a beat plus an appended aside.
  // `classifyClause` takes one clause, so the passage goes through `trimPassage`,
  // which splits at the dash and removes only the aside. (An earlier version of
  // this test fed the whole passage to `classifyClause`; it passed only because
  // the teaching guard had not yet learned the verb "recaptures".)
  it.each([
    ["We're Black against a 2050", 'rating'],
    ['this is going to be juicy.', 'author'],
    ['music to my ears.', 'author'],
  ])('cuts the clause %j as %s', (clause, klass) => {
    const r = classifyClause(clause);
    expect(r.disposition).toBe('cut');
    expect(r.class).toBe(klass);
  });

  it('silences the ply-2 passage entirely — every clause of it is chatter', () => {
    expect(trimPassage("We're Black against a 2050 — this is going to be juicy.")).toBe('');
  });

  it('keeps the beat and drops the aside', () => {
    expect(trimPassage('White recaptures with the knight — music to my ears.'))
      .toBe('White recaptures with the knight.');
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

describe('narration scoring — asides and the past-game register', () => {
  // The Accelerated Dragon's node `asides` — a field the first sweep report
  // never scanned — carry the post-game-review register into a Watch lesson:
  // the coach narrates how the pro's own game went while the student is being
  // walked through a teaching line for the first time. CLAUDE.md keeps those
  // registers apart deliberately.
  it.each([
    'In the game, after the bishop to d4 and knight to c3, Black is already better; the queen takes d8 was a mistake.',
    'A strong opponent met us with the bishop to c4, and we castled — an unfamiliar setup for both sides.',
    "After the knight's retreat to e2, in hindsight the calm d6 was perfectly reasonable too.",
    "The queen to d2 is a move I honestly hadn't come across.",
  ])('cuts past-game commentary: %j', (clause) => {
    expect(classifyClause(clause).disposition).toBe('cut');
  });

  it('does not read a capitalised word as a person when the verb is merely nearby', () => {
    // "With precise PLAY White is slightly better" was read as a person named
    // "With", because the verb check scanned a 22-character window instead of
    // requiring the verb to follow the name. Third false positive from this one
    // rule; it is anchored now.
    expect(namedPerson('With precise play White is slightly better, but it is playable.')).toBeNull();
    expect(namedPerson("Kusha knows this line very well.")).toBe('Kusha');
  });

  it('still keeps ordinary present-tense teaching about the demo line', () => {
    expect(
      classifyClause(
        "The bishop settles on g7, aimed straight down the long diagonal at White's centre and queenside.",
      ).disposition,
    ).toBe('keep');
  });
});

describe('pastGame overrides the teaching guard — the one class that may', () => {
  // The guard vetoes every other cut, and should: it saved 555 clauses of real
  // chess. But a review-register clause is full of chess words by nature, so the
  // guard protected an engine verdict delivered nine plies before the moves it
  // judges. Register, not vocabulary, is what is being judged.
  it('cuts a retrospective verdict even though it names squares and predicates chess', () => {
    const c =
      'The knight to d5 was flagged as a slip, and a later knight move judged an ' +
      'inaccuracy — the position stayed level, so blunder overstates it.';
    expect(teachesChess(c)).toBe(true);          // the guard WOULD protect it
    expect(classifyClause(c).class).toBe('pastGame');
    expect(classifyClause(c).disposition).toBe('cut');
  });

  it.each([
    'The knight steps back to e2 — a poor choice, because it abandons the strong central d4-square.',
    'The queen swings out to b6, forking the pawns on f2 and b2.',
    'White plays the correct plan — the pawn to h4, prying open our king.',
    'That is exactly the check to run before snatching a pawn: list the queen\'s escapes.',
  ])('does not touch present-tense teaching that judges the move on the board: %j', (clause) => {
    expect(classifyClause(clause).disposition).toBe('keep');
  });

  it('cuts the engine-review aside spoken mid-lesson', () => {
    for (const c of [
      'The verdict: the knight to g4 and the queen to b6 both earn approval.',
      "The engine's own preference was the immediate e6 — the very move we shied away from.",
      'With White castling we switched the engine on — a rare exception.',
    ]) {
      expect(classifyClause(c).disposition).toBe('cut');
    }
  });
});

describe('trimPassage — remove the chatter, keep the teaching', () => {
  // David 2026-09-12: "how do we systematically remove them from the corpus
  // without losing any of the important bits?" — with two lines named as
  // must-keeps. They are fixtures now.

  it.each([
    'The key question before ever taking like this is always the same — can the queen be trapped?',
    "That is exactly the check to run before snatching a pawn: list the queen's escapes, and ask whether any one move takes them all away.",
  ])('leaves David\'s named keepers byte-identical: %j', (line) => {
    expect(trimPassage(line)).toBe(line);
  });

  it('cuts the appended chatter and keeps the beat', () => {
    expect(
      trimPassage('The pawn to g6, the Accelerated Dragon fianchetto — only our second of the whole run.'),
    ).toBe('The pawn to g6, the Accelerated Dragon fianchetto.');
  });

  it('never cuts the head of a sentence while a later clause survives', () => {
    // "The key question ... is always the same" scores as a fragment on its own.
    // Cut it and the student hears "can the queen be trapped?" with no setup.
    const line = 'The key question before ever taking like this is always the same — can the queen be trapped?';
    expect(trimPassage(line)).toContain('The key question');
  });

  it('keeps a cut-class clause that is sandwiched between keepers', () => {
    const line =
      'The queen swings out to b6, forking the pawns on f2 and b2. It carries risk — our ' +
      "light-squared bishop still isn't out — but the pressure should tell.";
    expect(trimPassage(line)).toBe(line);
  });

  it('excises a fixed idiom rather than dropping the teaching behind it', () => {
    expect(
      trimPassage('White declines and lifts the queen to e3 — music to the ears, because now the check on e7 no longer bites.'),
    ).toBe('White declines and lifts the queen to e3 — because now the check on e7 no longer bites.');
  });

  it('drops a clause the idiom owned outright', () => {
    expect(trimPassage('White recaptures with the knight — music to my ears.'))
      .toBe('White recaptures with the knight.');
  });

  it('silences a sentence where nothing earns its place', () => {
    expect(trimPassage('The verdict: the knight to g4 and the queen to b6 both earn approval.')).toBe('');
  });

  it('documents the cost of holding `fragment` back', () => {
    // "With White castling we switched the engine on — a rare exception."
    //   └ pastGame, a confident cut        └ fragment, held back
    //
    // The held-back clause counts as a survivor, so the "never cut the head
    // while a later clause survives" rule protects the chatter in front of it.
    // That is the conservative direction and it is deliberate: the alternative
    // leaves a dangling "A rare exception." Enabling `fragment` resolves it.
    const line = 'With White castling we switched the engine on — a rare exception. The verdict: the knight to g4 and the queen to b6 both earn approval.';
    expect(trimPassage(line)).toBe('With White castling we switched the engine on — a rare exception.');
    expect(trimPassage(line, [...CONFIDENT_CUT_CLASSES, 'fragment'])).toBe('');
  });

  it('holds `fragment` back by default, so qualifications survive', () => {
    // The class that cannot be made precise by vocabulary. Both of these are
    // real teaching that the fragment rule would take.
    for (const line of [
      'This d6 setup is viable — not the worst, but far from the best.',
      "Black develops the knight to c6 — a viable move, and what people often play, but if Black isn't careful it can already drift into an inaccuracy.",
    ]) {
      expect(trimPassage(line)).toBe(line);
      expect(trimPassage(line, [...CONFIDENT_CUT_CLASSES, 'fragment'])).not.toBe(line);
    }
  });
});

describe('false positives caught in the dry run, before anything was written', () => {
  // Every one of these was cut by a confident class on the first pass over the
  // 430 source files. The dry run is why they are fixtures instead of edits.
  it.each([
    // namedPerson read "Always KNOW which..." as a person named Always. Fourth
    // false positive from that rule; it left the confident set instead.
    'Always know which decisions are likely to matter.',
    // "in the game" is ordinary chess English for "developed", not a reference
    // to the video's game.
    "but that doesn't help me, because I have no pieces in the game.",
    'We need to bring the rook into the game.',
  ])('keeps %j', (line) => {
    expect(trimPassage(line)).toBe(line);
  });

  it('still cuts the retrospective uses of the same phrase', () => {
    expect(trimPassage('In the game, after the bishop to d4 and knight to c3, Black is already better.')).toBe('');
    expect(trimPassage("After the knight's retreat to e2, in hindsight the calm d6 was perfectly reasonable too.")).toBe('');
  });

  it('does not put a full stop on a beat that continues into the next', () => {
    // Transcribed speech: "...the traditional move —" runs on. Appending a stop
    // produced "the traditional move —." on 1,255 passages, every one an edit
    // that changed nothing but punctuation.
    const line = 'd4 is the old main line, the traditional move —';
    expect(trimPassage(line)).toBe(line);
  });

  it('excludes namedPerson from the confident set', () => {
    expect(CONFIDENT_CUT_CLASSES).not.toContain('namedPerson');
    expect(CONFIDENT_CUT_CLASSES).not.toContain('fragment');
  });
});
