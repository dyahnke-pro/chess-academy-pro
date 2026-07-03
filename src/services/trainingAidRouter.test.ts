import { describe, it, expect } from 'vitest';
import { matchTrainingAidRoute } from './trainingAidRouter';

describe('matchTrainingAidRoute — calculation', () => {
  it('routes "drill calculation" (the reported bug)', () => {
    expect(matchTrainingAidRoute('drill calculation')?.path).toBe('/coach/endgame?tab=calculation');
  });
  it('routes "work on my calculation"', () => {
    expect(matchTrainingAidRoute('work on my calculation')?.path).toBe('/coach/endgame?tab=calculation');
  });
  it('routes "calculation practice"', () => {
    expect(matchTrainingAidRoute('calculation practice')?.path).toBe('/coach/endgame?tab=calculation');
  });
});

describe('matchTrainingAidRoute — endgame family', () => {
  it('routes "practice mating patterns"', () => {
    expect(matchTrainingAidRoute('practice mating patterns')?.path).toBe('/coach/endgame?tab=mating-patterns');
  });
  it('routes "checkmate practice"', () => {
    expect(matchTrainingAidRoute('checkmate practice')?.path).toBe('/coach/endgame?tab=mating-patterns');
  });
  it('routes "drill pawn endings"', () => {
    expect(matchTrainingAidRoute('drill pawn endings')?.path).toBe('/coach/endgame?tab=pawn-endings');
  });
  it('routes "rook endgame drill"', () => {
    expect(matchTrainingAidRoute('rook endgame drill')?.path).toBe('/coach/endgame?tab=rook-endings');
  });
  it('routes "drawing patterns"', () => {
    expect(matchTrainingAidRoute('show me drawing patterns')?.path).toBe('/coach/endgame?tab=drawing-patterns');
  });
  it('routes "endgame principles"', () => {
    expect(matchTrainingAidRoute('teach endgame principles')?.path).toBe('/coach/endgame?tab=principles');
  });
  it('routes "open the eval lab"', () => {
    expect(matchTrainingAidRoute('open the eval lab')?.path).toBe('/coach/endgame?tab=eval-lab');
  });
  it('routes generic "practice endgames" to the endgame surface', () => {
    expect(matchTrainingAidRoute('practice endgames')?.path).toBe('/coach/endgame');
  });
});

describe('matchTrainingAidRoute — tactics / puzzles', () => {
  it('routes "drill tactics" to the puzzle trainer', () => {
    expect(matchTrainingAidRoute('drill tactics')?.path).toBe('/coach/session/puzzle');
  });
  it('routes "give me a puzzle"', () => {
    expect(matchTrainingAidRoute('give me a puzzle')?.path).toBe('/coach/session/puzzle');
  });
  it('routes "give me a fork puzzle" with the theme', () => {
    expect(matchTrainingAidRoute('give me a fork puzzle')?.path).toBe('/coach/session/puzzle?theme=fork');
  });
  it('routes "drill pins" (themed, framed, no puzzle word)', () => {
    expect(matchTrainingAidRoute('drill pins')?.path).toBe('/coach/session/puzzle?theme=pin');
  });
  it('routes "discovered attack puzzles" (camelCase theme via spaced form)', () => {
    expect(matchTrainingAidRoute('discovered attack puzzles')?.path).toBe('/coach/session/puzzle?theme=discoveredAttack');
  });
  it('routes "endgame puzzles" to puzzles with theme=endgame (not the endgame tab)', () => {
    expect(matchTrainingAidRoute('endgame puzzles')?.path).toBe('/coach/session/puzzle?theme=endgame');
  });
});

describe('matchTrainingAidRoute — weaknesses / mistakes', () => {
  it('routes "work on my weaknesses"', () => {
    expect(matchTrainingAidRoute('work on my weaknesses')?.path).toBe('/weaknesses');
  });
  it('routes "drill my mistakes"', () => {
    expect(matchTrainingAidRoute('drill my mistakes')?.path).toBe('/tactics/mistakes');
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
