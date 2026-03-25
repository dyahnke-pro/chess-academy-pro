import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchTablebase, countPieces, formatTablebaseVerdict, type TablebaseResult } from './tablebases';

const MOCK_WIN: TablebaseResult = {
  dtz: 10,
  dtm: 14,
  checkmate: false,
  stalemate: false,
  variant_win: false,
  variant_loss: false,
  insufficient_material: false,
  category: 'win',
  moves: [
    { uci: 'e1e2', san: 'Ke2', dtz: -8, dtm: -12, zeroing: false, checkmate: false, stalemate: false, variant_win: false, variant_loss: false, insufficient_material: false, category: 'loss' },
  ],
};

const MOCK_DRAW: TablebaseResult = {
  dtz: null,
  dtm: null,
  checkmate: false,
  stalemate: false,
  variant_win: false,
  variant_loss: false,
  insufficient_material: false,
  category: 'draw',
  moves: [],
};

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('countPieces', () => {
  it('counts pieces in starting position (32)', () => {
    expect(countPieces('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(32);
  });

  it('counts pieces in KRK endgame (3)', () => {
    expect(countPieces('8/8/8/8/8/3K4/8/3Rk3 w - - 0 1')).toBe(3);
  });

  it('counts pieces in KQK endgame (3)', () => {
    expect(countPieces('8/8/8/8/8/8/8/3QK1k1 w - - 0 1')).toBe(3);
  });
});

describe('fetchTablebase', () => {
  it('fetches from correct URL with encoded FEN', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(MOCK_WIN), { status: 200 }));

    const fen = '8/8/8/8/8/3K4/8/3Rk3 w - - 0 1';
    await fetchTablebase(fen);

    expect(fetch).toHaveBeenCalledWith(
      `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`,
      expect.anything(),
    );
  });

  it('throws when piece count exceeds 7', async () => {
    const fen = '8/8/8/1RRRR3/1RRRR3/8/8/K6k w - - 0 1'; // >7 pieces
    await expect(fetchTablebase(fen)).rejects.toThrow('7 or fewer pieces');
  });

  it('returns TablebaseResult on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(MOCK_WIN), { status: 200 }));

    const result = await fetchTablebase('8/8/8/8/8/3K4/8/3Rk3 w - - 0 1');
    expect(result.category).toBe('win');
    expect(result.dtm).toBe(14);
    expect(result.moves).toHaveLength(1);
  });

  it('throws on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    await expect(fetchTablebase('8/8/8/8/8/3K4/8/3Rk3 w - - 0 1')).rejects.toThrow('Tablebase API error: 404');
  });
});

describe('formatTablebaseVerdict', () => {
  it('returns "White wins in N moves" for a win with white to move', () => {
    const verdict = formatTablebaseVerdict(MOCK_WIN, 'w');
    expect(verdict).toBe('White wins in 14 moves');
  });

  it('returns "White wins in N moves" for a loss with black to move', () => {
    const loss: TablebaseResult = { ...MOCK_WIN, category: 'loss' };
    const verdict = formatTablebaseVerdict(loss, 'b');
    expect(verdict).toBe('White wins in 14 moves');
  });

  it('returns "Black wins" for a win with black to move', () => {
    const verdict = formatTablebaseVerdict(MOCK_WIN, 'b');
    expect(verdict).toBe('Black wins in 14 moves');
  });

  it('returns "Theoretical draw" for draw', () => {
    const verdict = formatTablebaseVerdict(MOCK_DRAW, 'w');
    expect(verdict).toBe('Theoretical draw');
  });

  it('returns "Checkmate" when checkmate is true', () => {
    const result: TablebaseResult = { ...MOCK_WIN, checkmate: true };
    const verdict = formatTablebaseVerdict(result, 'w');
    expect(verdict).toBe('Checkmate');
  });

  it('returns "Stalemate" when stalemate is true', () => {
    const result: TablebaseResult = { ...MOCK_WIN, stalemate: true };
    const verdict = formatTablebaseVerdict(result, 'w');
    expect(verdict).toBe('Stalemate');
  });

  it('returns draw insufficient material message', () => {
    const result: TablebaseResult = { ...MOCK_DRAW, insufficient_material: true };
    const verdict = formatTablebaseVerdict(result, 'w');
    expect(verdict).toBe('Draw (insufficient material)');
  });

  it('handles cursed-win category', () => {
    const result: TablebaseResult = { ...MOCK_WIN, category: 'cursed-win' };
    const verdict = formatTablebaseVerdict(result, 'w');
    expect(verdict).toContain('Cursed win');
  });

  it('handles win without dtm (no move count)', () => {
    const result: TablebaseResult = { ...MOCK_WIN, dtm: null };
    const verdict = formatTablebaseVerdict(result, 'w');
    expect(verdict).toBe('White wins');
  });
});
