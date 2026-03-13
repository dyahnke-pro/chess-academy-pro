import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  gradeGuess,
  getStars,
  getWrongMoveMessage,
  getCorrectMoveMessage,
  getWelcomeMessage,
} from './gamesService';
import { buildOpeningRecord } from '../test/factories';

// Mock the openingService functions used internally
vi.mock('./openingService', () => ({
  getRepertoireOpenings: vi.fn().mockResolvedValue([]),
  getWeakestOpenings: vi.fn().mockResolvedValue([]),
  getWoodpeckerDue: vi.fn().mockResolvedValue([]),
  getFavoriteOpenings: vi.fn().mockResolvedValue([]),
}));

vi.mock('../db/schema', () => ({
  db: {
    games: {
      filter: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    },
  },
}));

describe('gamesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gradeGuess', () => {
    it('returns brilliant for < 10cp delta', () => {
      expect(gradeGuess(5)).toBe('brilliant');
      expect(gradeGuess(-8)).toBe('brilliant');
      expect(gradeGuess(0)).toBe('brilliant');
    });

    it('returns great for < 30cp delta', () => {
      expect(gradeGuess(15)).toBe('great');
      expect(gradeGuess(-25)).toBe('great');
    });

    it('returns good for < 60cp delta', () => {
      expect(gradeGuess(40)).toBe('good');
      expect(gradeGuess(-55)).toBe('good');
    });

    it('returns miss for >= 60cp delta', () => {
      expect(gradeGuess(100)).toBe('miss');
      expect(gradeGuess(-200)).toBe('miss');
    });
  });

  describe('getStars', () => {
    it('returns 3 stars for perfect (0 mistakes, 0 hints)', () => {
      expect(getStars(0, 0)).toBe(3);
    });

    it('returns 2 stars for 1-2 total mistakes+hints', () => {
      expect(getStars(1, 0)).toBe(2);
      expect(getStars(0, 2)).toBe(2);
      expect(getStars(1, 1)).toBe(2);
    });

    it('returns 1 star for 3+ total mistakes+hints', () => {
      expect(getStars(3, 0)).toBe(1);
      expect(getStars(1, 2)).toBe(1);
      expect(getStars(5, 5)).toBe(1);
    });
  });

  describe('getWrongMoveMessage', () => {
    it('returns a string message', () => {
      const opening = buildOpeningRecord({ keyIdeas: ['Control center'] });
      const msg = getWrongMoveMessage(opening, 0);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });

    it('references key ideas every third wrong move', () => {
      const opening = buildOpeningRecord({ keyIdeas: ['Control the d4 square'] });
      const msg = getWrongMoveMessage(opening, 2);
      expect(msg).toContain('Control the d4 square');
    });
  });

  describe('getCorrectMoveMessage', () => {
    it('returns a non-empty string', () => {
      const msg = getCorrectMoveMessage();
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });
  });

  describe('getWelcomeMessage', () => {
    it('includes the opening name', () => {
      const opening = buildOpeningRecord({ name: 'Vienna Game', color: 'white' });
      const msg = getWelcomeMessage(opening);
      expect(msg).toContain('Vienna Game');
    });

    it('includes the color', () => {
      const opening = buildOpeningRecord({ name: 'Sicilian', color: 'black' });
      const msg = getWelcomeMessage(opening);
      expect(msg).toContain('Black');
    });
  });
});
