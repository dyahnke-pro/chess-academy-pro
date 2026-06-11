import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveChesscomUsername, fetchChesscomPlayerGames } from './chesscomGamesService';

describe('resolveChesscomUsername', () => {
  it('maps known names to chess.com handles', () => {
    expect(resolveChesscomUsername('magnus')).toBe('magnuscarlsen');
    expect(resolveChesscomUsername('Magnus Carlsen')).toBe('magnuscarlsen');
    expect(resolveChesscomUsername('carlsen')).toBe('magnuscarlsen');
    expect(resolveChesscomUsername('Hikaru Nakamura')).toBe('hikaru');
    expect(resolveChesscomUsername('Daniel Naroditsky')).toBe('danielnaroditsky');
  });
  it('falls through to a spaceless handle for unknowns', () => {
    expect(resolveChesscomUsername('SomeRandomUser')).toBe('somerandomuser');
  });
});

describe('fetchChesscomPlayerGames', () => {
  afterEach(() => vi.unstubAllGlobals());

  const FULL_PGN =
    '[Event "Live Chess"]\n[White "MagnusCarlsen"]\n[Black "Opp"]\n[ECO "E04"]\n\n' +
    '1. d4 {[%clk 0:03:00]} 1... Nf6 {[%clk 0:03:00]} 2. c4 e6 3. Nf3 d5 4. g3 dxc4 1-0';

  it('parses the proxy payload and strips PGN to bare SAN', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            games: [
              {
                pgn: FULL_PGN,
                opponent: 'Opp',
                opponentRating: 2700,
                result: '1-0',
                studentSide: 'white',
                date: '2025',
                url: 'https://chess.com/game/1',
                openingName: 'Catalan Opening',
              },
            ],
            scanned: 30,
            matched: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const games = await fetchChesscomPlayerGames({ player: 'magnus', opening: 'catalan' });
    expect(games).toHaveLength(1);
    expect(games[0].pgn).toBe('d4 Nf6 c4 e6 Nf3 d5 g3 dxc4'); // headers + clocks stripped
    expect(games[0].opponent).toBe('Opp');
    expect(games[0].studentSide).toBe('white');
    expect(games[0].opponentRating).toBe(2700);
  });

  it('calls the proxy with resolved username + opening', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ games: [] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await fetchChesscomPlayerGames({ player: 'hikaru', opening: 'najdorf', color: 'black' });
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/api/chesscom-games');
    expect(calledUrl).toContain('username=hikaru');
    expect(calledUrl).toContain('opening=najdorf');
    expect(calledUrl).toContain('color=black');
  });

  it('returns [] on a non-ok response (degrades gracefully)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 502 })));
    const games = await fetchChesscomPlayerGames({ player: 'magnus', opening: 'catalan' });
    expect(games).toEqual([]);
  });

  it('skips games whose PGN cannot be parsed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ games: [{ pgn: 'not a real pgn', studentSide: 'white', opponent: 'X' }] }),
          { status: 200 },
        ),
      ),
    );
    const games = await fetchChesscomPlayerGames({ player: 'magnus', opening: 'catalan' });
    expect(games).toEqual([]);
  });
});
