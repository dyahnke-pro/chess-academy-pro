import { describe, expect, it } from 'vitest';
import { isTheoryQuestion, openingIdentityQuery, namesAnOpening } from './questionIntents';

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

// A name, not a topic (2026-10-27): the opening resolver maps chess words onto
// lines that carry them ("center" → the Center Game, "endgame" → a Caro-Kann
// "Endgame Offer"), so the words decide whether an opening was named.
describe('namesAnOpening', () => {
  it.each([
    'a3 sicillian', 'Ponziani', 'the Mengarini', 'Bowdler Attack', "King's Indian", "Queen's Gambit",
    'Four Knights', 'Center Game', "Bishop's Opening", 'London System', 'the Hippo', 'e4',
  ])('names an opening: %s', (n) => {
    expect(namesAnOpening(n)).toBe(true);
  });
  it.each([
    'center', 'the endgame', 'pins and forks', 'fianchetto', 'pawn structure', 'the opening', 'main line',
    'my weaknesses', 'this position', 'position', 'game', 'knight on f3', 'exchange sacrifice',
  ])('does not: %s', (n) => {
    expect(namesAnOpening(n)).toBe(false);
  });
  it('"tell me about the King\'s Indian" reaches the lane (the piece-word filter dropped it)', () => {
    expect(openingIdentityQuery("tell me about the King's Indian")).toBe("King's Indian");
  });
  it('"tell me about the endgame" does not', () => {
    expect(openingIdentityQuery('tell me about the endgame')).toBeNull();
  });
});
