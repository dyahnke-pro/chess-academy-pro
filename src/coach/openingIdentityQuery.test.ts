import { describe, expect, it } from 'vitest';
import { isTheoryQuestion, openingIdentityQuery } from './questionIntents';

describe('openingIdentityQuery — "what is the X about"', () => {
  it('reads the opening name out of the ask', () => {
    expect(openingIdentityQuery('What is the Alekhine Defense about?')).toBe('Alekhine Defense');
    expect(openingIdentityQuery("what's the idea behind the Marshall Attack")).toBe('Marshall Attack');
    expect(openingIdentityQuery('is the Najdorf sharp?')).toBe('Najdorf');
    expect(openingIdentityQuery('why do people play the London System?')).toBe('London System');
    expect(openingIdentityQuery('tell me about the Evans Gambit')).toBe('Evans Gambit');
  });
  it('a board ask is not an opening name', () => {
    expect(openingIdentityQuery('what is this position about?')).toBeNull();
    expect(openingIdentityQuery("what's the idea behind this move")).toBeNull();
    expect(openingIdentityQuery('is the knight on f3 safe?')).toBeNull();
  });
  it('the identity ask does not fall into the generic theory lane', () => {
    expect(isTheoryQuestion('What is the Alekhine Defense about?')).toBe(false);
  });
});
