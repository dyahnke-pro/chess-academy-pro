import { describe, it, expect } from 'vitest';
import {
  isPlanQuestion,
  isBestMoveQuestion,
  isTacticsQuestion,
  isPositionAssessmentQuestion,
  isMasterPlayQuestion,
  isEndgameQuestion,
  isPlayerGamesQuestion,
  isConceptQuestion,
  isProgressQuestion,
} from './coachService';

// David 2026-06-14: "throw the thesaurus at this problem for ALL questions."
// The grounded-answer routers must recognize a question however it's worded —
// the bug that started this was "what's the weakest aspect of my game?" falling
// through (it isn't "what are my weaknesses?"). Each block below asserts a wide
// spread of phrasings routes to the right computed-fact answer; the COLLISIONS
// block guards the documented disambiguations so widening one router doesn't
// hijack another.

describe('isProgressQuestion (weakness / improvement — the thesaurus bug)', () => {
  it('matches the original phrasing that failed', () => {
    expect(isProgressQuestion('What is the weakest aspect of my game?')).toBe(true);
  });
  it.each([
    'what are my weaknesses?',
    'what is my biggest weakness?',
    "what's my weakest area?",
    'what are my weak points',
    'what is the weakest part of my game',
    "what's the weakest aspect of my play",
    'where do I struggle the most',
    'where do I keep going wrong',
    'what are my bad habits',
    'what are my recurring mistakes',
    'what should I work on',
    'what do I need to improve',
    'what should I focus on to get better',
    'what should I practice',
    'am I improving',
    'how am I doing',
    "how's my chess progress",
    "what's holding me back",
    'what trips me up',
    'what am I worst at',
    "what's my biggest leak",
    'what are my strengths',
    'what keeps costing me games',
  ])('matches: %s', (q) => expect(isProgressQuestion(q)).toBe(true));
});

describe('isBestMoveQuestion', () => {
  it.each([
    "what's the best move here?",
    'what is the strongest continuation',
    'the best option here',
    'what should I play',
    'what would you play here',
    'is Nf3 the best move',
    'is this sound',
    'is that correct',
    'what is the right move',
    'should I take the pawn',
    'what is the move here',
    'top move?',
  ])('matches: %s', (q) => expect(isBestMoveQuestion(q)).toBe(true));
});

describe('isTacticsQuestion', () => {
  it.each([
    'is anything hanging',
    "what's the threat",
    'is there a fork here',
    'am I in danger',
    'is my queen safe',
    'is there a pin',
    'any tactics here',
    'is there a combination',
    'can I win material',
    'is there a sacrifice here',
    'is there mate in two',
    'is my rook loose',
  ])('matches: %s', (q) => expect(isTacticsQuestion(q)).toBe(true));
});

describe('isPositionAssessmentQuestion', () => {
  it.each([
    "who's winning",
    'who is better',
    "what's the eval",
    'what is the evaluation',
    'am I winning',
    'is this position good for me',
    'is it equal',
    'how do I stand',
    'where do I stand',
    "how's my position",
    'who has the advantage',
    'what is the situation',
    'is this drawish',
  ])('matches: %s', (q) => expect(isPositionAssessmentQuestion(q)).toBe(true));
});

describe('isMasterPlayQuestion', () => {
  it.each([
    'what do the masters play here',
    'how do grandmasters handle this',
    'what do GMs prefer',
    'most popular move',
    'most common continuation',
    "what's the main line",
    'what is the book move',
    'what does theory say',
    'what is usually played here',
  ])('matches: %s', (q) => expect(isMasterPlayQuestion(q)).toBe(true));
});

describe('isEndgameQuestion', () => {
  it.each([
    'is this endgame winning',
    'can I win this ending',
    'how do I hold this',
    'how do I convert this',
    'is this a theoretical draw',
    'is it drawn',
    'can this be held',
  ])('matches: %s', (q) => expect(isEndgameQuestion(q)).toBe(true));
});

describe('isPlayerGamesQuestion', () => {
  it.each([
    'how does Naroditsky play this',
    'show me his games',
    "show me Carlsen's games",
    'what does he play here',
    'has he ever played this',
    'his real games',
    'what did Hikaru play',
  ])('matches: %s', (q) => expect(isPlayerGamesQuestion(q)).toBe(true));
});

describe('isConceptQuestion', () => {
  it.each([
    "what's a fork",
    'what is zugzwang',
    'explain the minority attack',
    'define zwischenzug',
    'tell me about prophylaxis',
    'what does en passant mean',
    'what is the difference between a pin and a skewer',
  ])('matches: %s', (q) => expect(isConceptQuestion(q)).toBe(true));
  it('does NOT fire on position-specific cues (those go to tactics/best-move)', () => {
    expect(isConceptQuestion('is there a fork here')).toBe(false);
    expect(isConceptQuestion('what should I play here')).toBe(false);
  });
});

describe('isPlanQuestion', () => {
  it.each([
    "what's my plan",
    'what is the plan here',
    'what is my strategy',
    'what are the main ideas',
    'how should I proceed',
    'what is the idea here',
    'what am I trying to do',
    'outline a plan',
    'what are my next few moves',
  ])('matches: %s', (q) => expect(isPlanQuestion(q)).toBe(true));
});

// David 2026-06-14: strengthen ALL routers' vocabulary, not just weakness.
describe('strengthened vocabulary across every router', () => {
  const cases: Array<[string, (ask: string | undefined) => boolean, string]> = [
    ['plan', isPlanQuestion, 'where do my pieces belong'],
    ['plan', isPlanQuestion, 'what is the right setup'],
    ['plan', isPlanQuestion, 'what am I supposed to do'],
    ['best-move', isBestMoveQuestion, 'what do I do here'],
    ['best-move', isBestMoveQuestion, 'are there candidate moves'],
    ['best-move', isBestMoveQuestion, "what's the engine's pick"],
    ['best-move', isBestMoveQuestion, 'is there a better move'],
    ['tactics', isTacticsQuestion, 'is my bishop undefended'],
    ['tactics', isTacticsQuestion, 'can I sacrifice'],
    ['tactics', isTacticsQuestion, 'is there a back-rank weakness'],
    ['position', isPositionAssessmentQuestion, 'how bad is it'],
    ['position', isPositionAssessmentQuestion, 'am I up material'],
    ['position', isPositionAssessmentQuestion, 'who has the edge'],
    ['position', isPositionAssessmentQuestion, 'is it lost'],
    ['master-play', isMasterPlayQuestion, 'what is standard here'],
    ['master-play', isMasterPlayQuestion, 'how is this usually played'],
    ['master-play', isMasterPlayQuestion, 'what do the top players do'],
    ['endgame', isEndgameQuestion, 'is this winnable'],
    ['endgame', isEndgameQuestion, 'can I save this'],
    ['endgame', isEndgameQuestion, 'how do I convert from here'],
    ['player-games', isPlayerGamesQuestion, 'did he play this'],
    ['player-games', isPlayerGamesQuestion, 'how did Carlsen win'],
    ['player-games', isPlayerGamesQuestion, 'pull up his games'],
    ['concept', isConceptQuestion, 'what is the idea behind the fianchetto'],
    ['concept', isConceptQuestion, 'why is the bishop pair good'],
    ['concept', isConceptQuestion, 'what are the principles'],
  ];
  it.each(cases)('%s router matches: %s', (_label, fn, q) => expect(fn(q)).toBe(true));
});

describe('cross-router disambiguation (must NOT collide)', () => {
  it('progress questions are not mistaken for position assessment', () => {
    // "am I improving" is about the student over time, NOT "am I winning".
    expect(isProgressQuestion('am I improving')).toBe(true);
    expect(isPositionAssessmentQuestion('am I improving')).toBe(false);
  });
  it('a positional weakness is not a personal-progress question', () => {
    // "is d5 a weak square" is about the BOARD, not the student's weaknesses.
    expect(isProgressQuestion('is d5 a weak square here')).toBe(false);
  });
  it('best-move stays distinct from master-play', () => {
    expect(isBestMoveQuestion('what should I play here')).toBe(true);
    expect(isMasterPlayQuestion('what do the masters play here')).toBe(true);
  });
});
