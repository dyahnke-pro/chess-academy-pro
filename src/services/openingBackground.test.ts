// The opening's background, chosen in code: a history sentence with no move and
// no verdict, from the most specific Wikipedia page that is about chess.
import { describe, it, expect } from 'vitest';
import { backgroundSentence, backgroundFromResponse, wikipediaTitles } from './openingBackground';

describe('backgroundSentence', () => {
  it('takes the first sentence that tells history', () => {
    const text = 'The Najdorf Variation is a variation of the Sicilian Defence that begins with the moves: 1. e4 c5 2. Nf3 d6. '
      + 'It is one of the most respected and deeply studied of all chess openings. '
      + 'The variation is named after the Polish-Argentine grandmaster Miguel Najdorf. '
      + 'Bobby Fischer and Garry Kasparov played it throughout their careers.';
    expect(backgroundSentence(text)).toBe('The variation is named after the Polish-Argentine grandmaster Miguel Najdorf.');
  });
  it('never a sentence with a move in it', () => {
    expect(backgroundSentence('It was named after Najdorf, who played 5…a6 in 1946.')).toBeNull();
    expect(backgroundSentence('Popularised by Fischer, the move Nf3 became standard.')).toBeNull();
  });
  it('never a verdict on the line', () => {
    expect(backgroundSentence('It was analysed by Steinitz, who thought it unsound.')).toBeNull();
    expect(backgroundSentence('First played in 1843, it was later refuted by engines.')).toBeNull();
  });
  it('nothing when the page tells no history', () => {
    expect(backgroundSentence('The opening is very popular at club level. Many players enjoy it.')).toBeNull();
  });
});

describe('wikipediaTitles', () => {
  it('most specific first, Defence spelt the British way', () => {
    expect(wikipediaTitles('Sicilian Defense: Najdorf Variation')).toEqual(['Sicilian Defence, Najdorf Variation', 'Sicilian Defence']);
    expect(wikipediaTitles('London System')).toEqual(['London System']);
  });
});

describe('backgroundFromResponse', () => {
  const titles = ['Sicilian Defence, Mengarini Variation', 'Sicilian Defence'];
  it('falls back to the opening when the variation has no page, following redirects', () => {
    const r = backgroundFromResponse(titles, {
      query: {
        redirects: [{ from: 'Sicilian Defence', to: 'Sicilian Defence (chess)' }],
        pages: [
          { title: 'Sicilian Defence, Mengarini Variation', missing: true },
          { title: 'Sicilian Defence (chess)', description: 'Chess opening', extract: 'The Sicilian Defence is a chess opening. The earliest recorded notes on it date to the late 16th century, by the Italian chess player Giulio Polerio.' },
        ],
      },
    });
    expect(r?.sentence).toMatch(/Giulio Polerio/);
    expect(r?.url).toBe('https://en.wikipedia.org/wiki/Sicilian_Defence_(chess)');
  });
  it('never a page that is not about chess', () => {
    expect(backgroundFromResponse(['London System'], {
      query: { pages: [{ title: 'London System', description: 'Railway signalling', extract: 'The London System was introduced in 1902 by the railway company.' }] },
    })).toBeNull();
  });
});
