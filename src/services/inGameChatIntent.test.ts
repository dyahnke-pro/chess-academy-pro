import { describe, it, expect } from 'vitest';
import { detectInGameChatIntent } from './inGameChatIntent';

describe('detectInGameChatIntent', () => {
  describe('restart', () => {
    const restartPhrases = [
      'Restart the game!!',
      'restart',
      'reset',
      'reset the game',
      'new game',
      'start a new game',
      'start over',
      'Start over please',
      'fresh game',
      'fresh start',
      'fresh board',
      'take back to the starting position',
      'take back to start',
      'back to start',
      'back to the starting position',
      'from the start',
    ];

    it.each(restartPhrases)('matches restart phrase: %s', (text) => {
      expect(detectInGameChatIntent(text)).toEqual({ kind: 'restart' });
    });
  });

  describe('play-opening', () => {
    it('matches "Play the KID against me" and expands the alias', () => {
      expect(detectInGameChatIntent('Play the KID against me')).toEqual({
        kind: 'play-opening',
        openingName: "King's Indian Defense",
      });
    });

    it('matches bare "play the KID"', () => {
      expect(detectInGameChatIntent('play the KID')).toEqual({
        kind: 'play-opening',
        openingName: "King's Indian Defense",
      });
    });

    it('matches "let\'s play the French"', () => {
      expect(detectInGameChatIntent("let's play the French")).toEqual({
        kind: 'play-opening',
        openingName: 'French Defense',
      });
    });

    it('matches "play the Sicilian against me"', () => {
      expect(detectInGameChatIntent('play the Sicilian against me')).toEqual({
        kind: 'play-opening',
        openingName: 'Sicilian Defense',
      });
    });

    it('matches abbreviation QGD', () => {
      expect(detectInGameChatIntent('play the QGD')).toEqual({
        kind: 'play-opening',
        openingName: "Queen's Gambit Declined",
      });
    });

    it('matches full name "play the London"', () => {
      expect(detectInGameChatIntent('play the London')).toEqual({
        kind: 'play-opening',
        openingName: 'London System',
      });
    });

    it('returns null for non-matching opening', () => {
      expect(detectInGameChatIntent('play the Flibbertigibbet')).toBeNull();
    });
  });

  describe('fallthrough', () => {
    it('returns null for a general question', () => {
      expect(detectInGameChatIntent('what should I play here?')).toBeNull();
    });

    it('returns null for empty input', () => {
      expect(detectInGameChatIntent('')).toBeNull();
      expect(detectInGameChatIntent('   ')).toBeNull();
    });
  });
});
