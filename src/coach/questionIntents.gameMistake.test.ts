// GAME-SCOPED mistake asks ("biggest mistake in this game") belong to the
// game-mistake lane — answered from the reviewed game's OWN analysis, never
// the habit profile. Two habit-profile detectors also match this wording and
// dispatch FIRST, so each carries a game-scope opt-out:
//   - isMistakesQuestion (original wiring)
//   - isProgressQuestion (caught on prod 2026-08-13, run qafn-msrv28zv: the
//     progress lane served "you haven't played enough games…" to a question
//     about ONE game).
import { describe, it, expect } from 'vitest';
import { isGameMistakeQuestion, isMistakesQuestion, isProgressQuestion } from './questionIntents';

describe('isGameMistakeQuestion', () => {
  it.each([
    'what was the biggest mistake in this game?',
    'what was my worst move this game?',
    'where did I go wrong in this game?',
    'what was the turning point of the game?',
    'biggest blunder in that game?',
  ])('fires on the game-scoped ask: %s', (q) => {
    expect(isGameMistakeQuestion(q)).toBe(true);
  });

  it.each([
    'what mistakes do I keep making?',
    'what am I doing wrong?',
    'what are my most common mistakes?',
    "what's the best move?",
  ])('stays quiet without game scope: %s', (q) => {
    expect(isGameMistakeQuestion(q)).toBe(false);
  });
});

describe('habit-profile lanes yield to game scope', () => {
  const GAME_SCOPED = 'what was the biggest mistake in this game?';

  it('isMistakesQuestion opts out', () => {
    expect(isMistakesQuestion(GAME_SCOPED)).toBe(false);
  });

  it('isProgressQuestion opts out — the prod misroute', () => {
    expect(isProgressQuestion(GAME_SCOPED)).toBe(false);
    // …but keeps its own asks.
    expect(isProgressQuestion('what mistakes do I keep making?')).toBe(true);
  });
});
