import { describe, it, expect } from 'vitest';
import { MIN_PERSIST_PLIES, shouldPersistFinishedGame } from './coachGamePersistence';

describe('shouldPersistFinishedGame', () => {
  it('drops trivial misclick-resign / abandon games below the floor', () => {
    expect(shouldPersistFinishedGame(0)).toBe(false);
    expect(shouldPersistFinishedGame(2)).toBe(false); // 1-move resign
    expect(shouldPersistFinishedGame(4)).toBe(false); // 2-move resign
    expect(shouldPersistFinishedGame(MIN_PERSIST_PLIES - 1)).toBe(false);
  });

  it('persists real games at or above the floor', () => {
    expect(shouldPersistFinishedGame(MIN_PERSIST_PLIES)).toBe(true);
    expect(shouldPersistFinishedGame(7)).toBe(true); // Scholar's Mate
    expect(shouldPersistFinishedGame(40)).toBe(true);
  });

  it('applies the same floor regardless of how the game ended', () => {
    // The helper is ending-agnostic — resign, checkmate, timeout all share it.
    expect(shouldPersistFinishedGame(6)).toBe(true);
    expect(shouldPersistFinishedGame(5)).toBe(false);
  });
});
