import { describe, it, expect } from 'vitest';
import { isCounterRepertoireQuestion, isBestMoveQuestion, buildQuestionGrounding } from './questionIntents';
import { assembleCounterRepertoireAnswer, pickCounterRecommendation } from '../services/groundedAnswer';

// ─── The two live failures this intent exists to fix (David 2026-07-15) ──────

describe('isCounterRepertoireQuestion', () => {
  it("fires on David's live asks from the 2026-07-15 screenshots", () => {
    expect(isCounterRepertoireQuestion('What should I play against the Pirc?')).toBe(true);
    expect(isCounterRepertoireQuestion('I struggle against the KID. Which opening do you suggest I play against it and why?')).toBe(true);
  });

  it('fires on the thesaurus of recommendation phrasings', () => {
    for (const ask of [
      'what do you recommend against the caro-kann',
      'how should I meet the french',
      'best opening against the sicilian?',
      'what to play against the london system',
      'give me a solid line against the king\'s gambit',
      'which line would you suggest vs the scandinavian',
      'how do I counter the smith-morra',
    ]) {
      expect(isCounterRepertoireQuestion(ask), ask).toBe(true);
    }
  });

  it('does NOT fire on board asks (deictic against-objects)', () => {
    for (const ask of [
      'what should I play here?',
      'what should I play in this position',
      'what should I play against this position',
      'what is the best move',
      'what should I play now',
    ]) {
      expect(isCounterRepertoireQuestion(ask), ask).toBe(false);
    }
  });

  it('suppresses the best-move hijack in buildQuestionGrounding', () => {
    const g = buildQuestionGrounding('What should I play against the Pirc?');
    expect(g.counterRepertoireQuestion).toBe(true);
    expect(g.bestMoveQuestion).toBe(false);
    // sanity: a plain best-move ask still routes to best-move
    const g2 = buildQuestionGrounding('what is the best move here?');
    expect(g2.counterRepertoireQuestion ?? false).toBe(false);
    expect(isBestMoveQuestion('what is the best move here?')).toBe(true);
  });
});

// ─── The grounded computer ───────────────────────────────────────────────────

const ALAPIN = { openingId: 'pro-naroditsky-alapin', name: 'the Alapin (2.c3)', styleTags: ['solid', 'positional'], stat: { games: 2752, scorePct: 73.8 } };
const ROSSOLIMO = { openingId: 'pro-naroditsky-rossolimo', name: 'the Rossolimo Attack', styleTags: ['aggressive', 'sharp'], stat: { games: 4151, scorePct: 65.5 } };

describe('assembleCounterRepertoireAnswer', () => {
  it('single recommendation: first-person, anonymous stat, user matchup cited', () => {
    const a = assembleCounterRepertoireAnswer({
      opponentDisplayName: 'the Pirc Defense',
      studentSide: 'white',
      recommendations: [{ openingId: 'anti-pirc-austrian', name: 'the Austrian Attack (4.f4)', styleTags: ['aggressive', 'sharp'] }],
      userMatchup: { winRate: 13, games: 8 },
    });
    expect(a).not.toBeNull();
    expect(a!.facts).toContain('Austrian Attack');
    expect(a!.facts).toContain('13%');
    expect(a!.facts).toContain('8 games');
    // The phrasing contract: NEVER a pro's name.
    expect(a!.facts).not.toMatch(/naroditsky|gotham|hikaru|carlsen|caruana|rosen|aman|samay/i);
  });

  it('two recommendations, style-matched: names BOTH, recommends the matching one with the style reason', () => {
    const a = assembleCounterRepertoireAnswer({
      opponentDisplayName: 'the Sicilian',
      studentSide: 'white',
      recommendations: [ALAPIN, ROSSOLIMO],
      styleProfile: { style: 'sharp', count: 14, total: 20 },
    });
    expect(a).not.toBeNull();
    expect(a!.facts).toContain('Alapin');
    expect(a!.facts).toContain('Rossolimo');
    expect(a!.facts).toMatch(/lean sharp/);
    expect(a!.facts).toMatch(/start with the Rossolimo/);
    // the picked line's anonymous stat is cited
    expect(a!.facts).toContain('65.5%');
    expect(a!.facts).not.toMatch(/naroditsky/i);
  });

  it('two recommendations, quiet profile: recommends the solid line', () => {
    const a = assembleCounterRepertoireAnswer({
      opponentDisplayName: 'the Sicilian',
      studentSide: 'white',
      recommendations: [ALAPIN, ROSSOLIMO],
      styleProfile: { style: 'positional', count: 9, total: 12 },
    });
    expect(a!.facts).toMatch(/start with the Alapin/);
    expect(a!.facts).toContain('73.8%');
  });

  it('two recommendations, no profile (few analyzed games): neutral, defaults to curated order', () => {
    const a = assembleCounterRepertoireAnswer({
      opponentDisplayName: 'the Sicilian',
      studentSide: 'white',
      recommendations: [ALAPIN, ROSSOLIMO],
      styleProfile: null,
    });
    expect(a!.facts).toContain('Alapin');
    expect(a!.facts).toContain('Rossolimo');
    expect(a!.facts).not.toMatch(/your own games lean/i);
    expect(a!.facts).toMatch(/start with the Alapin/);
  });

  it('returns null on an empty recommendation list', () => {
    expect(assembleCounterRepertoireAnswer({ opponentDisplayName: 'x', studentSide: 'white', recommendations: [] })).toBeNull();
  });
});

describe('pickCounterRecommendation (the chip and the prose share one rule)', () => {
  it('picks the style-matched line', () => {
    expect(pickCounterRecommendation([ALAPIN, ROSSOLIMO], { style: 'aggressive', count: 6, total: 10 })?.openingId).toBe('pro-naroditsky-rossolimo');
    expect(pickCounterRecommendation([ALAPIN, ROSSOLIMO], { style: 'solid', count: 6, total: 10 })?.openingId).toBe('pro-naroditsky-alapin');
  });
  it('defaults to curated order without a profile and returns null on empty', () => {
    expect(pickCounterRecommendation([ALAPIN, ROSSOLIMO], null)?.openingId).toBe('pro-naroditsky-alapin');
    expect(pickCounterRecommendation([], null)).toBeNull();
  });
});
