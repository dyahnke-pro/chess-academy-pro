import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lookupPlayerOpeningMovesTool } from './lookupPlayerOpeningMoves';
import { _resetLichessCircuitBreaker } from '../../../services/lichessExplorerService';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Mock the Lichess /player explorer response shape. */
function mockFetch(payload: unknown, status = 200): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (): Promise<Response> =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
}

beforeEach(() => {
  _resetLichessCircuitBreaker();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('lookup_player_opening_moves tool', () => {
  it('is a read-only cerebellum tool', () => {
    expect(lookupPlayerOpeningMovesTool.name).toBe('lookup_player_opening_moves');
    expect(lookupPlayerOpeningMovesTool.category).toBe('cerebellum');
    expect(lookupPlayerOpeningMovesTool.kind).toBe('read');
  });

  it('requires player + fen', async () => {
    const a = await lookupPlayerOpeningMovesTool.execute({ color: 'white', fen: START_FEN });
    expect(a.ok).toBe(false);
    const b = await lookupPlayerOpeningMovesTool.execute({ player: 'DrNykterstein', color: 'white' });
    expect(b.ok).toBe(false);
  });

  it('returns the player move distribution ranked, with player-side win%', async () => {
    mockFetch({
      white: 1398,
      draws: 134,
      black: 447,
      moves: [
        { uci: 'e2e4', san: 'e4', averageOpponentRating: 3006, white: 432, draws: 38, black: 188, game: null },
        { uci: 'd2d4', san: 'd4', averageOpponentRating: 2980, white: 300, draws: 40, black: 120, game: null },
      ],
      opening: { eco: 'B00', name: "King's Pawn Game" },
    });
    const r = await lookupPlayerOpeningMovesTool.execute({ player: 'DrNykterstein', color: 'white', fen: START_FEN });
    expect(r.ok).toBe(true);
    const res = r.result as {
      player: string;
      totalGames: number;
      openingName: string | null;
      moves: { san: string; games: number; playerScorePct: number | null; avgOpponentRating: number | null }[];
    };
    expect(res.player).toBe('DrNykterstein');
    expect(res.totalGames).toBe(1398 + 134 + 447);
    expect(res.moves[0].san).toBe('e4');
    expect(res.moves[0].games).toBe(432 + 38 + 188);
    // White-side score = (wins + draws/2) / games.
    expect(res.moves[0].playerScorePct).toBe(Math.round(((432 + 38 * 0.5) / 658) * 100));
    expect(res.moves[0].avgOpponentRating).toBe(3006);
  });

  it('resolves a famous name to a verified Lichess username', async () => {
    mockFetch({ white: 1, draws: 0, black: 0, moves: [], opening: null });
    const r = await lookupPlayerOpeningMovesTool.execute({ player: 'Carlsen', color: 'white', fen: START_FEN });
    expect(r.ok).toBe(true);
    expect((r.result as { player: string }).player).toBe('DrNykterstein');
  });

  it('black-side win% counts black wins as favourable', async () => {
    mockFetch({
      white: 0,
      draws: 0,
      black: 0,
      moves: [{ uci: 'c7c6', san: 'c6', averageOpponentRating: 2500, white: 20, draws: 10, black: 70, game: null }],
      opening: { eco: 'B10', name: 'Caro-Kann Defense' },
    });
    const r = await lookupPlayerOpeningMovesTool.execute({ player: 'someuser', color: 'black', fen: START_FEN });
    const res = r.result as { moves: { playerScorePct: number | null }[] };
    // Black score = (black + draws/2)/games = (70 + 5)/100 = 75%.
    expect(res.moves[0].playerScorePct).toBe(75);
  });

  it('empty moves => a note telling the brain not to fabricate', async () => {
    mockFetch({ white: 0, draws: 0, black: 0, moves: [], opening: null });
    const r = await lookupPlayerOpeningMovesTool.execute({ player: 'nobody-xyz', color: 'white', fen: START_FEN });
    expect(r.ok).toBe(true);
    const res = r.result as { moves: unknown[]; note?: string };
    expect(res.moves).toHaveLength(0);
    expect(res.note).toMatch(/don't invent/i);
  });
});
