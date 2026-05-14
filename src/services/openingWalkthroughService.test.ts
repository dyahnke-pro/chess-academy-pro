import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';

import { reconstructPathForPuzzle } from './openingWalkthroughService';

// Mock the Lichess explorer used by the bridge layer.
vi.mock('./lichessExplorerService', () => ({
  fetchLichessExplorer: vi.fn(),
}));
import { fetchLichessExplorer } from './lichessExplorerService';

// Mock global fetch (the puzzle endpoint).
const originalFetch = global.fetch;

function mockPuzzleResponse(pgn: string, initialPly: number): void {
  // @ts-expect-error — overriding global fetch
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ game: { pgn }, puzzle: { initialPly } }),
  }));
}

function mockPuzzleFetchFails(status = 500): void {
  // @ts-expect-error — overriding global fetch
  global.fetch = vi.fn(async () => ({
    ok: false,
    status,
    json: async () => ({}),
  }));
}

function fenKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

function fenAfterPlies(sans: string[]): string {
  const c = new Chess();
  for (const san of sans) c.move(san);
  return c.fen();
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  global.fetch = originalFetch;
});

// vitest exposes these globals — local shim for the type checker.
function afterEach(fn: () => void): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).afterEach?.(fn);
}

describe('reconstructPathForPuzzle', () => {
  it('returns the exact prefix when initialPly matches the target FEN', async () => {
    // Italian opening, 6 plies → target = position after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'];
    const target = fenAfterPlies(sans);
    mockPuzzleResponse(sans.concat(['Ng5', 'd5']).join(' '), sans.length);

    const result = await reconstructPathForPuzzle('puzzle-id', target);
    expect(result.found).toBe(true);
    expect(result.sans).toEqual(sans);
    expect(fetchLichessExplorer).not.toHaveBeenCalled();
  });

  it('PGN-scan recovers when initialPly is off by one (drift case)', async () => {
    // Target FEN is at ply 5, but Lichess reports initialPly = 7. The
    // PGN-scan should find the match at ply 5 and return sans[0..5].
    const fullSans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6'];
    const target = fenAfterPlies(fullSans.slice(0, 5)); // e4 e5 Nf3 Nc6 Bc4
    mockPuzzleResponse(fullSans.join(' '), 7); // wrong initialPly

    const result = await reconstructPathForPuzzle('puzzle-id', target);
    expect(result.found).toBe(true);
    expect(result.sans).toEqual(fullSans.slice(0, 5));
    expect(fenKey(fenAfterPlies(result.sans))).toBe(fenKey(target));
    expect(fetchLichessExplorer).not.toHaveBeenCalled();
  });

  it('PGN-scan recovers when initialPly is too LOW (puzzle is past the reported ply)', async () => {
    // initialPly says 3 but our actual puzzle FEN is at ply 6.
    const fullSans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
    const target = fenAfterPlies(fullSans);
    mockPuzzleResponse(fullSans.join(' '), 3);

    const result = await reconstructPathForPuzzle('puzzle-id', target);
    expect(result.found).toBe(true);
    expect(result.sans).toEqual(fullSans);
  });

  it('explorer-bridge plays the most-popular continuation when the PGN never reaches target', async () => {
    // PGN ends after `e4 e5 Nf3 Nc6 Bc4 Bc5`. Target is the position
    // AFTER `c3` is added (Italian Game: Giuoco Pianissimo prep).
    // Source-game PGN never plays c3, so PGN-scan fails. The bridge
    // queries the explorer once at the PGN terminus and tries the
    // top move (c3). It lands on target.
    const pgnSans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
    const target = fenAfterPlies([...pgnSans, 'c3']);
    mockPuzzleResponse(pgnSans.join(' '), pgnSans.length);

    vi.mocked(fetchLichessExplorer).mockResolvedValueOnce({
      white: 0, draws: 0, black: 0,
      moves: [{ uci: 'c2c3', san: 'c3', averageRating: 2000, white: 100, draws: 50, black: 50, game: null }],
      topGames: [],
      opening: null,
    });

    const result = await reconstructPathForPuzzle('puzzle-id', target);
    expect(result.found).toBe(true);
    expect(result.sans).toEqual([...pgnSans, 'c3']);
    expect(fetchLichessExplorer).toHaveBeenCalledTimes(1);
  });

  it('explorer-bridge keeps trying for multiple plies until target is reached', async () => {
    const pgnSans = ['e4', 'e5'];
    const bridge = ['Nf3', 'Nc6', 'Bb5']; // Ruy Lopez setup
    const target = fenAfterPlies([...pgnSans, ...bridge]);
    mockPuzzleResponse(pgnSans.join(' '), pgnSans.length);

    // Each explorer call returns one move.
    vi.mocked(fetchLichessExplorer)
      .mockResolvedValueOnce({
        white: 0, draws: 0, black: 0,
        moves: [{ uci: 'g1f3', san: 'Nf3', averageRating: 2000, white: 100, draws: 50, black: 50, game: null }],
        topGames: [], opening: null,
      })
      .mockResolvedValueOnce({
        white: 0, draws: 0, black: 0,
        moves: [{ uci: 'b8c6', san: 'Nc6', averageRating: 2000, white: 80, draws: 40, black: 40, game: null }],
        topGames: [], opening: null,
      })
      .mockResolvedValueOnce({
        white: 0, draws: 0, black: 0,
        moves: [{ uci: 'f1b5', san: 'Bb5', averageRating: 2000, white: 60, draws: 30, black: 30, game: null }],
        topGames: [], opening: null,
      });

    const result = await reconstructPathForPuzzle('puzzle-id', target);
    expect(result.found).toBe(true);
    expect(result.sans).toEqual([...pgnSans, ...bridge]);
    expect(fetchLichessExplorer).toHaveBeenCalledTimes(3);
  });

  it('falls back to found=false when the bridge cannot close the gap within depth budget', async () => {
    const pgnSans = ['e4', 'e5'];
    const target = fenAfterPlies(['d4', 'd5']); // unreachable from pgnSans

    mockPuzzleResponse(pgnSans.join(' '), pgnSans.length);

    // Explorer returns moves that don't lead to target; depth budget
    // will exhaust without a match.
    vi.mocked(fetchLichessExplorer).mockResolvedValue({
      white: 0, draws: 0, black: 0,
      moves: [{ uci: 'g1f3', san: 'Nf3', averageRating: 2000, white: 100, draws: 50, black: 50, game: null }],
      topGames: [], opening: null,
    });

    const result = await reconstructPathForPuzzle('puzzle-id', target);
    expect(result.found).toBe(false);
    expect(result.sans).toEqual(pgnSans); // initialPly slice as the give-up payload
  });

  it('falls back to found=false when the puzzle endpoint errors out', async () => {
    mockPuzzleFetchFails(500);
    const result = await reconstructPathForPuzzle('puzzle-id', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(result.found).toBe(false);
    expect(result.sans).toEqual([]);
  });

  it('falls back to found=false when explorer probes themselves error', async () => {
    const pgnSans = ['e4', 'e5'];
    const target = fenAfterPlies(['d4', 'd5']);
    mockPuzzleResponse(pgnSans.join(' '), pgnSans.length);
    vi.mocked(fetchLichessExplorer).mockRejectedValue(new Error('circuit open'));

    const result = await reconstructPathForPuzzle('puzzle-id', target);
    expect(result.found).toBe(false);
    expect(result.sans).toEqual(pgnSans);
  });
});
