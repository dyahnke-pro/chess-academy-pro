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
