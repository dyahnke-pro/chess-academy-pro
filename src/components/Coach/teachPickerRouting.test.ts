import { describe, expect, it } from 'vitest';
import { routeStage, type TeachStage } from './teachStageRouting';
import { resolveOpeningEntry } from '../../services/openingDetectionService';

/**
 * Does every picker actually DO what its label promises?
 *
 * David 2026-08-17: *"how does quiz me work? is that coded for? if not, it
 * needs to be. make sure all other pickers work as well"*.
 *
 * Each picker builds a phrase and submits it as if the student had typed it,
 * so a picker is only as good as the regex its phrasing happens to hit — and
 * nothing checked that pairing. The two known failures were both one missing
 * word and both found by driving prod, not by reading code: "play X against me"
 * started a WALKTHROUGH (board never moved), and "traps in X" fell through to
 * the brain, which correctly refused to invent chess content.
 *
 * Two things have to hold for every picker, and one alone is worthless:
 *   1. the phrase routes to the stage the LABEL promises;
 *   2. the opening NAME survives the verb strip and still resolves.
 * A phrase that routes perfectly but eats the name lands the student in a
 * lesson about nothing.
 */
describe('every Learn picker routes to the stage its label promises', () => {
  /** Mirrors PICKER_ACTIONS in CoachTeachPage — label, phrasing, intent. */
  const PICKERS: ReadonlyArray<{ label: string; build: (o: string) => string; stage: TeachStage | null }> = [
    { label: 'Teach me', build: (o) => o, stage: null },
    { label: 'Drill', build: (o) => `drill ${o}`, stage: 'drill' },
    { label: 'Quiz me on', build: (o) => `quiz me on ${o}`, stage: 'concepts' },
    { label: 'Trap lines for', build: (o) => `punish lines for ${o}`, stage: 'punish' },
    { label: 'Play', build: (o) => `play it for real ${o}`, stage: 'play-real' },
  ];

  /** The openings the picker offers when nothing is favourited. */
  const OPENINGS = [
    'Four Knights Game', 'Two Knights Defence', 'Trompowsky Attack',
    'Caro-Kann Defence', 'London System', 'French Defence',
  ];

  it.each(PICKERS)('$label routes to its stage for every offered opening', ({ build, stage }) => {
    for (const opening of OPENINGS) {
      const route = routeStage(build(opening));
      expect(route.stage, `"${build(opening)}" routed to ${route.stage}`).toBe(stage);
    }
  });

  it.each(PICKERS)('$label leaves an opening name that still resolves', ({ build }) => {
    for (const opening of OPENINGS) {
      const { remainder } = routeStage(build(opening));
      expect(remainder.length, `the verb ate the name in "${build(opening)}"`).toBeGreaterThan(0);
      expect(resolveOpeningEntry(remainder), `"${remainder}" no longer resolves`).toBeTruthy();
    }
  });

  it('the free-form starters route where their wording promises', () => {
    // These are what a student taps FIRST, so a starter that lands on the wrong
    // surface is the worst possible introduction. Each exercises a different
    // route on purpose — see SUGGESTIONS in CoachTeachPage.
    const cases: ReadonlyArray<[string, TeachStage | null]> = [
      ['Teach me the Four Knights Game', null],
      ['Play the Caro-Kann Defence against me', 'play-real'],
      ['Traps in the Two Knights Defence', 'punish'],
      ['Quiz me on the French Defence', 'concepts'],
    ];
    for (const [text, stage] of cases) {
      expect(routeStage(text).stage, `"${text}"`).toBe(stage);
    }
  });

  it('treats a follow-up that names no opening as being about the lesson in front of you', () => {
    // David 2026-08-17, from real use: *"during the quiz questions when i then
    // ask coach to 'quiz me on lines' it doesnt know which opening im talking
    // about"*. The remainder after the verb is a deictic — it points at the
    // lesson already running — and the component falls back to the active
    // walkthrough's opening for exactly these. The list ended at a SINGULAR
    // `line`, so "lines" missed and was fuzzy-matched as an opening name
    // instead, mid-quiz, with the Vienna on the board.
    //
    // Asserted on the shape the component tests: routing must leave the
    // deictic intact (not swallow it, which would look like a bare request)
    // AND the deictic must be recognised as naming no opening.
    const namesNoOpening = (t: string) =>
      /^(?:(?:this|that|the|current|my|these|those)\s+)?(?:positions?|boards?|games?|lines?|variations?|moves?|ideas?|here|it|them)$/i.test(t)
      || /^(?:some\s+|any\s+|a\s+few\s+)?(?:more|another|other|others|again|next|else|extra)(?:\s+(?:one|ones|lines?))?$/i.test(t);

    for (const ask of ['quiz me on lines', 'quiz me on the lines', 'quiz me on these lines',
                       'drill the variations', 'quiz me on more lines', 'quiz me on this position']) {
      const { stage, remainder } = routeStage(ask);
      expect(stage, `"${ask}" lost its stage`).not.toBeNull();
      expect(namesNoOpening(remainder), `"${ask}" -> "${remainder}" was read as an opening name`).toBe(true);
    }
  });

  it('keeps "play through" a walkthrough, not a game', () => {
    // The distinction the play patterns are carefully written around: asking to
    // play THROUGH a line is a request to watch it, and routing that to a live
    // game would take the lesson away from someone who asked to be shown.
    expect(routeStage('play through the Vienna').stage).not.toBe('play-real');
  });

  it('does not eat the opening name after a dangling preposition', () => {
    // "play against me IN the Vienna" leaves "in the Vienna", and there is no
    // opening called "in the" — found on a varied sweep, fixed by the trim.
    const { stage, remainder } = routeStage('play against me in the Vienna');
    expect(stage).toBe('play-real');
    expect(remainder.toLowerCase()).not.toMatch(/^in\b/);
    expect(resolveOpeningEntry(remainder)).toBeTruthy();
  });
});
