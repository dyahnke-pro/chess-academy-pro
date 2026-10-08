import { describe, expect, it } from 'vitest';
import { stripQuestionFiller } from './questionIntents';

// Answers swarm P0 (2026-10-07): the filler stripper never deletes a word the
// question turns on.
describe('stripQuestionFiller keeps the words that carry the question', () => {
  it.each([
    ['is the position even?', 'is the position even?'],
    ['is it even?', 'is it even?'],
    ['is that an even trade', 'is that an even trade'],
    ['what then?', 'what then?'],
    ['if I take, then what?', 'if I take, then what?'],
    ['tell me about the Najdorf', 'tell me about the Najdorf'],
  ])('"%s" keeps its meaning', (ask, want) => {
    expect(stripQuestionFiller(ask)).toBe(want);
  });
  it.each([
    ['what am I even doing here', 'what am I doing here'],
    ['is that even legal?', 'is that legal?'],
    ['honestly what should I work on', 'what should I work on'],
  ])('hedge in "%s" is still stripped', (ask, want) => {
    expect(stripQuestionFiller(ask)).toBe(want);
  });
});
