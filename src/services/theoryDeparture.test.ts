import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findTheoryDeparture, walkBookLine, ratingBandFor, type TheoryLookup } from './theoryDeparture';
import type { MasterPlayResult } from './masterPlayTypes';

/** Canned masters world: known positions keyed by full fen prefix match. */
function cannedLookup(known: Map<string, MasterPlayResult>): TheoryLookup {
  return async (fen: string) => {
    for (const [key, res] of known) {
      if (fen.startsWith(key.split(' ').slice(0, 2).join(' '))) return res;
    }
    return { fen, totalGames: 0, moves: [], source: 'none' };
  };
}

function res(fen: string, moves: Array<[string, number]>): MasterPlayResult {
  return {
    fen,
    totalGames: moves.reduce((a, [, g]) => a + g, 0),
    moves: moves.map(([san, games]) => ({ san, games, white: games, draws: 0, black: 0 })),
    source: 'local',
  };
}

/** Build fens/sans for a line from the start position. */
function line(sans: string[]): { fens: string[]; sans: string[] } {
  const c = new Chess();
  const fens = [c.fen()];
  for (const s of sans) {
    c.move(s);
    fens.push(c.fen());
  }
  return { fens, sans };
}

describe('theoryDeparture — where the game left the book (Phase 4)', () => {
  // 1.e4 e5 2.Nf3 and then the OFF move 2...h6 (not in the canned book).
  const game = line(['e4', 'e5', 'Nf3', 'h6']);
  const start = new Chess();
  const afterE4 = new Chess(); afterE4.move('e4');
  const afterE5 = new Chess(afterE4.fen()); afterE5.move('e5');
  const afterNf3 = new Chess(afterE5.fen()); afterNf3.move('Nf3');
  const book = new Map<string, MasterPlayResult>([
    [start.fen(), res(start.fen(), [['e4', 500], ['d4', 400]])],
    [afterE4.fen(), res(afterE4.fen(), [['e5', 300], ['c5', 350]])],
    [afterE5.fen(), res(afterE5.fen(), [['Nf3', 450], ['Nc3', 60]])],
    [afterNf3.fen(), res(afterNf3.fen(), [['Nc6', 400], ['Nf6', 90]])],
    // position after 2...h6 deliberately ABSENT → the departure.
  ]);

  it('finds the departing ply and the masters main move with its share', async () => {
    const dep = await findTheoryDeparture(game.fens, game.sans, {
      lookup: cannedLookup(book),
      amateurFetch: async () => ({ moves: [
        { san: 'Nc6', white: 100, draws: 20, black: 80 },
        { san: 'd6', white: 40, draws: 5, black: 35 },
      ] }),
    });
    expect(dep).not.toBeNull();
    expect(dep!.departurePly).toBe(4); // 2...h6 is the 4th ply
    expect(dep!.departedSan).toBe('h6');
    expect(dep!.mainMove.san).toBe('Nc6');
    expect(dep!.mainMove.pct).toBeCloseTo(400 / 490, 5);
    expect(dep!.totalGames).toBe(490);
    expect(dep!.yourLevel).not.toBeNull();
    expect(dep!.yourLevel!.san).toBe('Nc6');
    expect(dep!.yourLevel!.pct).toBeCloseTo(200 / 280, 5);
  });

  it('self-hides (null) when the game never leaves book in the window', async () => {
    const inBook = line(['e4', 'e5']);
    const dep = await findTheoryDeparture(inBook.fens, inBook.sans, {
      lookup: cannedLookup(book),
      amateurFetch: async () => null,
    });
    expect(dep).toBeNull();
  });

  it('self-hides when the book position lacks real mass', async () => {
    const thin = new Map(book);
    thin.set(afterNf3.fen(), res(afterNf3.fen(), [['Nc6', 5]])); // < MIN_BOOK_GAMES
    const dep = await findTheoryDeparture(game.fens, game.sans, {
      lookup: cannedLookup(thin),
      amateurFetch: async () => null,
    });
    expect(dep).toBeNull();
  });

  it('self-hides on the transposition artifact (departed move IS the main move)', async () => {
    const weird = new Map(book);
    weird.set(afterNf3.fen(), res(afterNf3.fen(), [['h6', 400]]));
    const dep = await findTheoryDeparture(game.fens, game.sans, {
      lookup: cannedLookup(weird),
      amateurFetch: async () => null,
    });
    expect(dep).toBeNull();
  });

  it('your-level stats fail open to null without killing the departure', async () => {
    const dep = await findTheoryDeparture(game.fens, game.sans, {
      lookup: cannedLookup(book),
      amateurFetch: async () => { throw new Error('explorer down'); },
    });
    expect(dep).not.toBeNull();
    expect(dep!.yourLevel).toBeNull();
  });

  it('walkBookLine plays the greedy most-played continuation, chess.js-verified', async () => {
    const plies = await walkBookLine(afterE5.fen(), { lookup: cannedLookup(book), maxPlies: 4 });
    // From after 1...e5: book says Nf3, then Nc6, then the book runs out.
    expect(plies.map((p) => p.san)).toEqual(['Nf3', 'Nc6']);
    const c = new Chess(afterE5.fen());
    for (const p of plies) {
      expect(() => c.move(p.san)).not.toThrow();
      expect(c.fen()).toBe(p.fenAfter);
    }
  });

  it('ratingBandFor maps ratings to sane bands', () => {
    expect(ratingBandFor(null)).toBe('1000,1200');
    expect(ratingBandFor(1500)).toBe('1400,1600');
    expect(ratingBandFor(1900)).toBe('1600,1800');
    expect(ratingBandFor(2300)).toBe('2000,2200');
  });
});
