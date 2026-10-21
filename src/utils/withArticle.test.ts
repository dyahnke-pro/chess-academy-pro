import { describe, it, expect } from 'vitest';
import { withArticle } from './andList';
import { PATTERN_SPEECH } from '../services/tacticVocabulary';

describe('withArticle — the article by sound', () => {
  it('the Learn tape line: an overloaded defender, never "a overloaded"', () => {
    expect(withArticle('overloaded defender')).toBe('an overloaded defender');
  });
  it('grades, pieces and tactic words', () => {
    expect(['inaccuracy', 'mistake', 'blunder', 'knight', 'exchange', 'unguarded piece'].map(withArticle))
      .toEqual(['an inaccuracy', 'a mistake', 'a blunder', 'a knight', 'an exchange', 'an unguarded piece']);
  });
  it('vowel letters said as consonants, and a silent h', () => {
    expect(['one-move threat', 'unique move', 'useful square', 'hour'].map(withArticle))
      .toEqual(['a one-move threat', 'a unique move', 'a useful square', 'an hour']);
  });
  it('a lone letter is said as its name', () => {
    expect(['e-file', 'f4 knight', 'h-pawn', 'b5 bishop', 'd-pawn'].map(withArticle))
      .toEqual(['an e-file', 'an f4 knight', 'an h-pawn', 'a b5 bishop', 'a d-pawn']);
  });
  it('a number as it is said', () => {
    expect([8, '11-move line', '18', '1800-rated player', '80%', '50%', '110', '1200'].map(withArticle))
      .toEqual(['an 8', 'an 11-move line', 'an 18', 'an 1800-rated player', 'an 80%', 'a 50%', 'a 110', 'a 1200']);
  });
  it('every tactic word in the one table reads right', () => {
    for (const [kind, s] of Object.entries(PATTERN_SPEECH)) {
      if (!s.word) continue;
      const vowel = /^[aeiou]/.test(s.word);
      expect(withArticle(s.word), kind).toBe(`${vowel ? 'an' : 'a'} ${s.word}`);
    }
  });
});
