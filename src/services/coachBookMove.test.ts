import { describe, it, expect } from 'vitest';
import {
  pickBookMove,
  plyCountFromFen,
  bookMoveToSquares,
  isBookMoveLegal,
} from './coachBookMove';
import type { LichessExplorerResult } from '../types';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// After 1.e4 — Black to move, ply 1
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

function explorerStub(partial: Partial<LichessExplorerResult> = {}): LichessExplorerResult {
  return {
    white: 500_000,
    draws: 400_000,
    black: 400_000,
    moves: [
      { uci: 'e7e5', san: 'e5', averageRating: 1900, white: 200_000, draws: 150_000, black: 150_000, game: null },
      { uci: 'c7c5', san: 'c5', averageRating: 1950, white: 150_000, draws: 120_000, black: 130_000, game: null },
      { uci: 'e7e6', san: 'e6', averageRating: 1900, white: 80_000, draws: 70_000, black: 70_000, game: null },
      { uci: 'c7c6', san: 'c6', averageRating: 1900, white: 70_000, draws: 60_000, black: 50_000, game: null },
    ],
    topGames: [],
    opening: { eco: 'B00', name: "King's Pawn Opening" },
    ...partial,
  };
}

describe('plyCountFromFen', () => {
  it('returns 0 for the starting position', () => {
    expect(plyCountFromFen(START_FEN)).toBe(0);
  });

  it('returns 1 after 1.e4 (black to move)', () => {
    expect(plyCountFromFen(AFTER_E4_FEN)).toBe(1);
  });

  it('counts full-move + half-move properly', () => {
    // After 1.e4 e5 2.Nf3 — Black to move, fullmove 2
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKBNR b KQkq - 1 2';
    expect(plyCountFromFen(fen)).toBe(3);
  });
});

describe('pickBookMove', () => {
  it('returns null when the ply count is beyond maxPly', async () => {
    const deep = 'r1bqk2r/pp2bppp/2n2n2/3pp3/3P4/1B2PN2/PPPN1PPP/R1BQ1RK1 w kq - 4 8';
    const result = await pickBookMove(deep, {
      __explorerResultForTests: explorerStub(),
      maxPly: 12,
    });
    expect(result).toBeNull();
  });

  it('returns null when total games is below the minimum', async () => {
    const result = await pickBookMove(AFTER_E4_FEN, {
      __explorerResultForTests: explorerStub({
        white: 10, draws: 10, black: 10,
      }),
      minTotalGames: 500,
    });
    expect(result).toBeNull();
  });

  it('returns null when the explorer has no move list', async () => {
    const result = await pickBookMove(AFTER_E4_FEN, {
      __explorerResultForTests: explorerStub({ moves: [] }),
    });
    expect(result).toBeNull();
  });

  it('returns null when the explorer fetch rejects', async () => {
    // Without a stub, the service attempts fetchLichessExplorer and
    // returns null on any error (including "fetch is not defined" in jsdom).
    const result = await pickBookMove(AFTER_E4_FEN, { __explorerResultForTests: null });
    expect(result).toBeNull();
  });

  it('picks the top move when rng falls in its bucket', async () => {
    const result = await pickBookMove(AFTER_E4_FEN, {
      __explorerResultForTests: explorerStub(),
      rng: () => 0,
    });
    expect(result?.san).toBe('e5');
  });

  it('picks a secondary move when rng skews high', async () => {
    const result = await pickBookMove(AFTER_E4_FEN, {
      __explorerResultForTests: explorerStub(),
      rng: () => 0.99,
      topN: 3,
    });
    // With rng=0.99 we land in the last candidate bucket.
    expect(['e5', 'c5', 'e6']).toContain(result?.san);
    expect(result?.san).not.toBe('c6'); // not in top-3 slice
  });

  it('exposes the opening name from the explorer payload', async () => {
    const result = await pickBookMove(AFTER_E4_FEN, {
      __explorerResultForTests: explorerStub(),
      rng: () => 0,
    });
    expect(result?.openingName).toBe("King's Pawn Opening");
  });
});

describe('bookMoveToSquares', () => {
  it('splits a UCI without promotion', () => {
    expect(bookMoveToSquares({ san: 'Nf3', uci: 'g1f3' })).toEqual({
      from: 'g1',
      to: 'f3',
      promotion: undefined,
    });
  });

  it('preserves the promotion suffix when present', () => {
    expect(bookMoveToSquares({ san: 'e8=Q', uci: 'e7e8q' })).toEqual({
      from: 'e7',
      to: 'e8',
      promotion: 'q',
    });
  });

  it('returns null on malformed UCI', () => {
    expect(bookMoveToSquares({ san: '?', uci: 'xx' })).toBeNull();
  });
});

describe('isBookMoveLegal', () => {
  it('accepts a legal book move', () => {
    expect(
      isBookMoveLegal(AFTER_E4_FEN, { san: 'e5', uci: 'e7e5' }),
    ).toBe(true);
  });

  it('rejects an illegal book move', () => {
    expect(
      isBookMoveLegal(AFTER_E4_FEN, { san: 'Ke2', uci: 'e8e2' }),
    ).toBe(false);
  });
});
