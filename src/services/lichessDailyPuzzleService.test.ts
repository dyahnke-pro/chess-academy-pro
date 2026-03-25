import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchLichessDailyPuzzle, _resetDailyPuzzleCache } from './lichessDailyPuzzleService';

const MOCK_RESPONSE = {
  game: {
    id: 'abc123',
    pgn: 'e4 e5 Nf3 Nc6 Bb5',
    players: [
      { userId: 'white_user', name: 'WhitePlayer', color: 'white' as const, rating: 1850 },
      { userId: 'black_user', name: 'BlackPlayer', color: 'black' as const, rating: 1780 },
    ],
  },
  puzzle: {
    id: 'zxcvbn',
    rating: 1542,
    plays: 4321,
    solution: ['e2e4', 'd7d5', 'e4d5'],
    themes: ['fork', 'middlegame'],
    initialPly: 10,
  },
};

beforeEach(() => {
  _resetDailyPuzzleCache();
  vi.spyOn(globalThis, 'fetch');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchLichessDailyPuzzle', () => {
  it('fetches from the correct URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(MOCK_RESPONSE), { status: 200 }));

    await fetchLichessDailyPuzzle();

    const [calledUrl, calledInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe('https://lichess.org/api/puzzle/daily');
    expect((calledInit.headers as Record<string, string>)['Accept']).toBe('application/json');
  });

  it('maps the response to LichessDailyPuzzle shape', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(MOCK_RESPONSE), { status: 200 }));

    const puzzle = await fetchLichessDailyPuzzle();

    expect(puzzle.id).toBe('zxcvbn');
    expect(puzzle.rating).toBe(1542);
    expect(puzzle.themes).toEqual(['fork', 'middlegame']);
    expect(puzzle.solution).toEqual(['e2e4', 'd7d5', 'e4d5']);
    expect(puzzle.initialPly).toBe(10);
    expect(puzzle.white).toBe('WhitePlayer');
    expect(puzzle.black).toBe('BlackPlayer');
  });

  it('caches the result and does not re-fetch within 1 hour', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(MOCK_RESPONSE), { status: 200 }));

    await fetchLichessDailyPuzzle();
    await fetchLichessDailyPuzzle();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    await expect(fetchLichessDailyPuzzle()).rejects.toThrow('Lichess daily puzzle API error: 404');
  });

  it('re-fetches after cache reset', async () => {
    const makeResponse = (): Response => new Response(JSON.stringify(MOCK_RESPONSE), { status: 200 });
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse())
      .mockResolvedValueOnce(makeResponse());

    await fetchLichessDailyPuzzle();
    _resetDailyPuzzleCache();
    await fetchLichessDailyPuzzle();

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to "White"/"Black" when player names missing', async () => {
    const sparse = {
      ...MOCK_RESPONSE,
      game: { ...MOCK_RESPONSE.game, players: [] },
    };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(sparse), { status: 200 }));

    const puzzle = await fetchLichessDailyPuzzle();
    expect(puzzle.white).toBe('White');
    expect(puzzle.black).toBe('Black');
  });
});
