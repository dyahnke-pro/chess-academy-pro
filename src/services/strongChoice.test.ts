import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { strongChoice } from './strongChoice';
import { __resetHisPlayDbForTests, __setHisPlayDbForTests } from './hisPlayLookup';
import { positionFen } from './masterPlayCache';

const fen = (() => { const c = new Chess(); c.move('e4'); c.move('c6'); return c.fen(); })();

afterEach(() => __resetHisPlayDbForTests());

describe('strongChoice — his games, depersonalized', () => {
  it('confirms the student played the strong choice, and never names another move (Learn names no move unasked, 2026-10-19)', () => {
    __setHisPlayDbForTests({ [positionFen(fen)]: { total: 30, moves: [{ san: 'd4', games: 24, w: 14, d: 6, l: 4 }, { san: 'Nc3', games: 6, w: 2, d: 2, l: 2 }] } });
    expect(strongChoice(fen, 'd4')?.text).toBe("That's what strong players play here — it stakes out the center and grabs space.");
    // David's replay, 2.d4: "Strong players play Nf3 here" was heard as his next move.
    expect(strongChoice(fen, 'Nf3')).toBeNull();
  });
  it('gives the reason and never a count or a percentage (David 2026-10-06: reason, not stats)', () => {
    __setHisPlayDbForTests({ [positionFen(fen)]: { total: 24, moves: [{ san: 'd4', games: 13, w: 4, d: 3, l: 6 }, { san: 'Nc3', games: 9, w: 5, d: 1, l: 3 }, { san: 'c4', games: 2, w: 1, d: 0, l: 1 }] } });
    expect(strongChoice(fen, 'd4')).toBeNull(); // a better-scoring move exists: not named, not affirmed
    const t = strongChoice(fen, 'Nc3')?.text ?? '';
    expect(t).toMatch(/^That's what strong players play here — it /);
    expect(t.replace(/[a-h][1-8]/g, '')).not.toMatch(/\d/);
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
