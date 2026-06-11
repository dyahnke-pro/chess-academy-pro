import { describe, it, expect } from 'vitest';
import { parsePlayerGameRequest } from './playerGameRequest';

describe('parsePlayerGameRequest', () => {
  describe('matches real player-game asks', () => {
    const cases: Array<[string, string, string]> = [
      // [input, expectedPlayer, expectedOpeningQuery]
      ['show me a game that magnus played the catalan opening', 'magnus', 'catalan'],
      ['show me a game that magnus played the catalan', 'magnus', 'catalan'],
      ['show me a game magnus played the catalan', 'magnus', 'catalan'],
      ['how does magnus play the catalan', 'magnus', 'catalan'],
      ['how does carlsen play the catalan opening', 'carlsen', 'catalan'],
      ['how does hikaru play the najdorf', 'hikaru', 'najdorf'],
      ['how does carlsen play against the catalan', 'carlsen', 'catalan'],
      ["magnus's catalan game", 'magnus', 'catalan'],
      ["carlsen's french defense games", 'carlsen', 'french defense'],
      ['a game that magnus played the catalan', 'magnus', 'catalan'],
      ['show me magnus in the catalan', 'magnus', 'catalan'],
      ['can you show me a game naroditsky played the caro-kann', 'naroditsky', 'caro-kann'],
      ['show me a game that magnus won with the catalan', 'magnus', 'catalan'],
    ];
    it.each(cases)('%s → player/opening', (input, player, opening) => {
      const r = parsePlayerGameRequest(input);
      expect(r).not.toBeNull();
      expect(r?.player.toLowerCase()).toBe(player);
      expect(r?.openingQuery.toLowerCase()).toBe(opening);
    });
  });

  describe('does NOT match plain opening / non-player asks', () => {
    const negatives = [
      'show me the catalan',
      'teach me the catalan',
      'walk me through the catalan opening',
      'the catalan',
      'show me a game in the catalan', // no player named
      'how does white play the catalan', // "white" is not a player
      'how do i play the catalan', // "i" is not a player
      'middle game plans in the pirc',
      'I played e4. Your move.',
      'i just played the catalan',
      'what is the catalan',
      'quiz me on the catalan',
      'play the catalan',
    ];
    it.each(negatives)('rejects "%s"', (input) => {
      expect(parsePlayerGameRequest(input)).toBeNull();
    });
  });

  it('strips a trailing question mark from the opening', () => {
    const r = parsePlayerGameRequest('how does magnus play the catalan?');
    expect(r?.openingQuery.toLowerCase()).toBe('catalan');
  });

  it('keeps multi-word player names', () => {
    const r = parsePlayerGameRequest('how does magnus carlsen play the catalan');
    expect(r?.player.toLowerCase()).toBe('magnus carlsen');
  });

  it('rejects absurdly long input (a paragraph, not a request)', () => {
    const long = 'show me a game '.repeat(20) + 'magnus played the catalan';
    expect(parsePlayerGameRequest(long)).toBeNull();
  });
});
