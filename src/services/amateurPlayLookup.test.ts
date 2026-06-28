import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupAmateurPlay, __resetAmateurPlayLookupForTests } from './amateurPlayLookup';
import { fetchLichessExplorer } from './lichessExplorerService';

vi.mock('./lichessExplorerService', () => ({ fetchLichessExplorer: vi.fn() }));
const fetchMock = vi.mocked(fetchLichessExplorer);

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

beforeEach(() => {
  fetchMock.mockReset();
  __resetAmateurPlayLookupForTests();
});

describe('lookupAmateurPlay', () => {
  it('maps explorer W/D/L into a MasterPlayResult with games sums', async () => {
    fetchMock.mockResolvedValue({
      white: 0, draws: 0, black: 0,
      moves: [
        { san: 'e4', uci: 'e2e4', white: 500, draws: 200, black: 300 },
        { san: 'd4', uci: 'd2d4', white: 100, draws: 50, black: 50 },
      ],
    } as never);
    const r = await lookupAmateurPlay(FEN);
    expect(r.source).toBe('lichess-live');
    expect(r.moves[0].san).toBe('e4');         // sorted by games desc
    expect(r.moves[0].games).toBe(1000);
    expect(r.totalGames).toBe(1200);
  });

  it('returns source none on an empty explorer response', async () => {
    fetchMock.mockResolvedValue({ white: 0, draws: 0, black: 0, moves: [] } as never);
    const r = await lookupAmateurPlay(FEN);
    expect(r.source).toBe('none');
    expect(r.moves).toHaveLength(0);
  });

  it('returns source none (never throws) when the explorer call fails', async () => {
    fetchMock.mockRejectedValue(new Error('lichess-explorer-circuit-open'));
    const r = await lookupAmateurPlay(FEN);
    expect(r.source).toBe('none');
  });

  it('skips the network entirely with localOnly', async () => {
    const r = await lookupAmateurPlay(FEN, { localOnly: true });
    expect(r.source).toBe('none');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caches — a second lookup for the same FEN does not re-fetch', async () => {
    fetchMock.mockResolvedValue({
      white: 0, draws: 0, black: 0,
      moves: [{ san: 'e4', white: 500, draws: 200, black: 300 }],
    } as never);
    await lookupAmateurPlay(FEN);
    await lookupAmateurPlay(FEN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
