import { describe, it, expect } from 'vitest';
import { matchTrainingAidRoute } from './trainingAidRouter';

// Drillable aids now set a REAL puzzle up ON THE BOARD in Learn
// (David 2026-07-03: no tab routing; coach sets them up on the board).
// The handoff route is /coach/teach?drill=<aid>; the aid slug drives
// coachDrillService.pickCoachDrill.
describe('matchTrainingAidRoute — calculation (in-place Learn drill)', () => {
  it('routes "drill calculation" (the reported bug)', () => {
    const r = matchTrainingAidRoute('drill calculation');
    expect(r?.path).toBe('/coach/teach?drill=calculation');
    expect(r?.aid).toBe('calculation');
  });
  it('routes "work on my calculation"', () => {
    expect(matchTrainingAidRoute('work on my calculation')?.aid).toBe('calculation');
  });
  it('routes "calculation practice"', () => {
    expect(matchTrainingAidRoute('calculation practice')?.aid).toBe('calculation');
  });
});

describe('matchTrainingAidRoute — endgame family', () => {
  it('routes "practice mating patterns" to a board drill', () => {
    expect(matchTrainingAidRoute('practice mating patterns')?.path).toBe('/coach/teach?drill=mating-patterns');
  });
  it('routes "checkmate practice"', () => {
    expect(matchTrainingAidRoute('checkmate practice')?.aid).toBe('mating-patterns');
  });
  it('routes "drill pawn endings"', () => {
    expect(matchTrainingAidRoute('drill pawn endings')?.path).toBe('/coach/teach?drill=pawn-endings');
  });
  it('routes "rook endgame drill"', () => {
    expect(matchTrainingAidRoute('rook endgame drill')?.path).toBe('/coach/teach?drill=rook-endings');
  });
  it('routes "drawing patterns" to its lesson tab (not a board drill)', () => {
    expect(matchTrainingAidRoute('show me drawing patterns')?.path).toBe('/coach/endgame?tab=drawing-patterns');
  });
  it('routes "endgame principles" to its lesson tab', () => {
    expect(matchTrainingAidRoute('teach endgame principles')?.path).toBe('/coach/endgame?tab=principles');
  });
  it('routes "open the eval lab" to its lesson tab', () => {
    expect(matchTrainingAidRoute('open the eval lab')?.path).toBe('/coach/endgame?tab=eval-lab');
  });
  it('routes generic "practice endgames" to a board drill', () => {
    expect(matchTrainingAidRoute('practice endgames')?.path).toBe('/coach/teach?drill=endgame');
  });
});

describe('matchTrainingAidRoute — tactics / puzzles (in-place Learn drill)', () => {
  it('routes "drill tactics" to a board drill', () => {
    expect(matchTrainingAidRoute('drill tactics')?.path).toBe('/coach/teach?drill=puzzle');
  });
  it('routes "give me a puzzle"', () => {
    expect(matchTrainingAidRoute('give me a puzzle')?.path).toBe('/coach/teach?drill=puzzle');
  });
  it('routes "give me a fork puzzle" with the theme', () => {
    expect(matchTrainingAidRoute('give me a fork puzzle')?.path).toBe('/coach/teach?drill=puzzle%3Afork');
  });
  it('routes "drill pins" (themed, framed, no puzzle word)', () => {
    expect(matchTrainingAidRoute('drill pins')?.aid).toBe('puzzle:pin');
  });
  it('routes "discovered attack puzzles" (camelCase theme via spaced form)', () => {
    expect(matchTrainingAidRoute('discovered attack puzzles')?.aid).toBe('puzzle:discoveredAttack');
  });
  it('routes "endgame puzzles" to a themed board drill', () => {
    expect(matchTrainingAidRoute('endgame puzzles')?.aid).toBe('puzzle:endgame');
  });
});

describe('matchTrainingAidRoute — a tactics QUESTION about the live board is NOT a drill (David 2026-07-04 audit)', () => {
  // On a live /coach/play game these must reach the grounded brain, not yank
  // the student out to a puzzle drill.
  it.each([
    'is there a tactic here?',
    'any tactics in this position?',
    'what tactics should I look for?',
    'was there a tactic I missed?',
    "what's the tactic here",
    'do I have a tactic?',
    'show me the tactic here',   // framed but live-board reference
    'show me a fork in this position',
  ])('QUESTION → null (grounded brain): %s', (q) => {
    expect(matchTrainingAidRoute(q)).toBeNull();
  });
  // IMPERATIVE trainer requests STILL drill.
  it.each([
    ['give me a tactics puzzle', '/coach/teach?drill=puzzle'],
    ['drill tactics', '/coach/teach?drill=puzzle'],
    ['tactics puzzle please', '/coach/teach?drill=puzzle'],
    ['show me a fork puzzle', '/coach/teach?drill=puzzle%3Afork'],
  ])('IMPERATIVE → drill: %s', (q, path) => {
    expect(matchTrainingAidRoute(q)?.path).toBe(path);
  });
});

describe('matchTrainingAidRoute — weaknesses / mistakes (adaptive mistake queue)', () => {
  it('routes "work on my weaknesses" to the in-place mistake queue', () => {
    const r = matchTrainingAidRoute('work on my weaknesses');
    expect(r?.path).toBe('/coach/teach?drill=mistakes');
    expect(r?.aid).toBe('mistakes');
  });
  it('routes "drill my mistakes" to the in-place mistake queue', () => {
    expect(matchTrainingAidRoute('drill my mistakes')?.path).toBe('/coach/teach?drill=mistakes');
  });
  it('does NOT hijack "what\'s my weakness in the Sicilian?"', () => {
    expect(matchTrainingAidRoute("what's my weakness in the Sicilian?")).toBeNull();
  });
});

describe('matchTrainingAidRoute — diagnosis questions fall through to the grounded brain (David 2026-07-04)', () => {
  // A DIAGNOSIS / recommendation QUESTION must NOT be hijacked into a drill —
  // it's the grounded coach's job to name the student's weaknesses. The word
  // "tactics"/"endgame" in the QUESTION used to trigger the drill branch.
  it.each([
    'what tactics am I weak in?',
    'what tactics am I bad at',
    'where am I weakest in tactics',
    'what endgames do I struggle with',
    'where am I losing my games',
    'what should I train?',
    'what should I learn next?',
    'what am I worst at',
    'which phase do I lose in',
    "what's holding me back",
  ])('diagnosis → null (brain grounds it): %s', (q) => {
    expect(matchTrainingAidRoute(q)).toBeNull();
  });

  // But an explicit drill IMPERATIVE (no interrogative lead-in) STILL drills.
  it('imperative "drill my weaknesses" still routes to the mistake queue', () => {
    expect(matchTrainingAidRoute('drill my weaknesses')?.aid).toBe('mistakes');
  });
  it('imperative "give me a tactics puzzle" still routes to a puzzle drill', () => {
    expect(matchTrainingAidRoute('give me a tactics puzzle')?.path).toBe('/coach/teach?drill=puzzle');
  });
  it('imperative "practice endgames" still routes to an endgame drill', () => {
    expect(matchTrainingAidRoute('practice endgames')?.path).toBe('/coach/teach?drill=endgame');
  });
});

describe('matchTrainingAidRoute — puzzle STATS questions fall through to the grounded brain (David 2026-07-05 functional audit)', () => {
  // "what's my puzzle rating?" is a STATS question (isPuzzleStatsQuestion), not a
  // drill — the word "puzzle" used to hijack it into a puzzle drill ("no
  // mistakes due to review").
  it.each([
    "what's my puzzle rating?",
    'what is my puzzle rating',
    'how many puzzles have I solved',
    'my puzzle accuracy',
    'my puzzle stats',
    'how good am I at puzzles',
  ])('puzzle-stats → null (brain grounds it): %s', (q) => {
    expect(matchTrainingAidRoute(q)).toBeNull();
  });
  // But an explicit puzzle-drill IMPERATIVE still drills.
  it('imperative "give me a puzzle" still routes to a puzzle drill', () => {
    expect(matchTrainingAidRoute('give me a puzzle')?.aid).toBe('puzzle');
  });
});

describe('matchTrainingAidRoute — non-matches (fall through to brain / opening router)', () => {
  it('does NOT match an opening drill "drill the Vienna"', () => {
    expect(matchTrainingAidRoute('drill the Vienna')).toBeNull();
  });
  it('does NOT match an opening drill "drill the Najdorf"', () => {
    expect(matchTrainingAidRoute('drill the Najdorf')).toBeNull();
  });
  it('does NOT match a bare calculation question', () => {
    expect(matchTrainingAidRoute('how do I calculate better?')).toBeNull();
  });
  it('does NOT match a position question mentioning a fork', () => {
    expect(matchTrainingAidRoute('is that a fork?')).toBeNull();
  });
  it('does NOT match empty input', () => {
    expect(matchTrainingAidRoute('   ')).toBeNull();
  });
  it('does NOT match a plain greeting', () => {
    expect(matchTrainingAidRoute('hello coach')).toBeNull();
  });
});
