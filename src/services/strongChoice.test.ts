import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { strongChoice } from './strongChoice';
import { __resetHisPlayDbForTests, __setHisPlayDbForTests } from './hisPlayLookup';
import { positionFen } from './masterPlayCache';

const fen = (() => { const c = new Chess(); c.move('e4'); c.move('c6'); return c.fen(); })();

afterEach(() => __resetHisPlayDbForTests());

describe('strongChoice — his games, depersonalized', () => {
  it('confirms the student played the strong choice, and names it when not', () => {
    __setHisPlayDbForTests({ [positionFen(fen)]: { total: 30, moves: [{ san: 'd4', games: 24, w: 14, d: 6, l: 4 }, { san: 'Nc3', games: 6, w: 2, d: 2, l: 2 }] } });
    expect(strongChoice(fen, 'd4')?.text).toBe("That is a strong player's choice here — played in 24 of 30 games from this position, scoring 71%.");
    expect(strongChoice(fen, 'Nf3')?.text).toBe("A strong player's choice here is d4 — played in 24 of 30 games from this position, scoring 71%.");
  });
  it('never names a person', () => {
    __setHisPlayDbForTests({ [positionFen(fen)]: { total: 30, moves: [{ san: 'd4', games: 24, w: 14, d: 6, l: 4 }] } });
    expect(strongChoice(fen, 'd4')?.text).not.toMatch(/\b(he|his|him|Danya|Naroditsky)\b/i);
  });
  it('silent below the games floor or with no DB', () => {
    __setHisPlayDbForTests({ [positionFen(fen)]: { total: 5, moves: [{ san: 'd4', games: 5, w: 5, d: 0, l: 0 }] } });
    expect(strongChoice(fen, 'd4')).toBeNull();
    __resetHisPlayDbForTests();
    expect(strongChoice(fen, 'd4')).toBeNull();
  });
});
