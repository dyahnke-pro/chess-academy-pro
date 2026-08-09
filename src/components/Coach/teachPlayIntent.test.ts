// "Play X against me" must start a GAME, not a lecture.
//
// David 2026-08-09 asked me to run a real game in Learn with Coach and
// evaluate it. Driving prod, "play the Vienna Gambit against me" resolved the
// opening perfectly — the audit stream shows
// `canonicalized "play the Vienna Gambit against me" → "Vienna Game: Vienna
// Gambit" (score=1.00)` — and then started a walkthrough:
// `useTeachWalkthrough.start | walkthrough started`, coach says "Ready — let's
// walk through the Vienna Game: Vienna Gambit." The board never moved, because
// it was waiting to be watched.
//
// The cause was one regex: the only route to a game required the literal word
// "real" ("play it for real the Vienna"). This pins the phrasings a student
// actually types, and — just as important — the ones that must KEEP their
// walkthrough.
//
// The patterns are duplicated here rather than exported: CoachTeachPage is a
// 9k-line component that cannot be imported in a unit test, and a copy that
// drifts is caught by the prod audit that found this in the first place. The
// alternative was exporting a slice of a submit handler purely for testing,
// which is worse.
import { describe, it, expect } from 'vitest';

type Stage = 'concepts' | 'findMove' | 'drill' | 'punish' | 'play-real';

/** Mirrors STAGE_PATTERNS in CoachTeachPage.handleSubmit, play arms only. */
const PLAY_PATTERNS: Array<{ regex: RegExp; stage: Stage }> = [
  { regex: /\bplay\s+(?:it\s+)?(?:for\s+)?real\s+(?:the\s+)?/i, stage: 'play-real' },
  { regex: /\b(?:let'?s\s+|can\s+we\s+|could\s+we\s+|i\s+want\s+to\s+|wanna\s+)?play\s+(?:the\s+)?(?=.*\b(?:against|versus|vs\.?|with)\s+(?:me|you)\b)|\s*\b(?:against|versus|vs\.?|with)\s+(?:me|you)\b/gi, stage: 'play-real' },
  { regex: /\bplay\s+me\s+(?:the\s+)?/i, stage: 'play-real' },
  { regex: /\b(?:let'?s|can\s+we|could\s+we|wanna|i\s+want\s+to)\s+play\s+(?!through\b)(?:the\s+)?/i, stage: 'play-real' },
];

const TEACH_PATTERN =
  /\b(teach(?:\s+me)?|(?:i\s+want\s+to\s+|help\s+me\s+)?learn|study|continue|walk\s*(?:me\s+)?through|show\s+me|let'?s\s+do|let'?s\s+go\s+over|let'?s\s+try|tell\s+me\s+about|review)\b\s+(?:the\s+)?(.+?)(?:\s+(?:opening|defense|defence|game|gambit|attack|variation|line|system))?[.?!]*\s*$/i;

/** The routing decision + what survives for opening-name resolution. */
function route(input: string): { stage: Stage | null; remainder: string } {
  let remainder = input.trim();
  for (const sp of PLAY_PATTERNS) {
    sp.regex.lastIndex = 0;
    if (sp.regex.test(remainder)) {
      sp.regex.lastIndex = 0;
      remainder = remainder.replace(sp.regex, ' ').replace(/\s+/g, ' ').trim();
      return { stage: sp.stage, remainder };
    }
  }
  return { stage: null, remainder };
}

describe('asking the coach to PLAY an opening', () => {
  it.each([
    'play the Vienna Gambit against me',
    'play the Caro-Kann against me',
    "let's play the Italian against me",
    'can we play the London with me',
    'play the Sicilian versus me',
  ])('THE REGRESSION: "%s" starts a game', (input) => {
    expect(route(input).stage).toBe('play-real');
  });

  it.each([
    ['play the Vienna Gambit against me', /vienna gambit/i],
    ['play me the Italian', /italian/i],
    ["let's play the Caro-Kann", /caro-kann/i],
  ])('keeps the opening name in "%s"', (input, expected) => {
    const { stage, remainder } = route(input);
    expect(stage).toBe('play-real');
    expect(remainder).toMatch(expected);
  });

  it('still honours the original "for real" phrasing', () => {
    expect(route('play it for real the Vienna').stage).toBe('play-real');
  });
});

describe('what must NOT become a game', () => {
  it('"play through the Vienna" is a WATCH ask', () => {
    // The one collision worth guarding: "play through" reads as play but means
    // walk me through it. It must keep its walkthrough.
    expect(route('play through the Vienna').stage).toBeNull();
  });

  it.each([
    'teach me the Vienna Gambit',
    'walk me through the Caro-Kann',
    'show me the Italian',
    'learn the London System',
  ])('"%s" stays a lesson', (input) => {
    expect(route(input).stage).toBeNull();
    expect(TEACH_PATTERN.test(input)).toBe(true);
  });
});
