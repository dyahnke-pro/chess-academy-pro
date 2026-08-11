// THE BAND HAS TO REACH THE NETWORK CALL, OR IT IS DECORATION.
//
// David 2026-08-11: "Based on rating I want coach making mistakes! Maybe have
// coach use the amateur database for openings?" — the whole build turns on the
// explorer being asked for the RIGHT rating bucket. Left unset it answers with
// "1600,1800,2000,2200,2500", every band at once, masters-adjacent players
// included: a 1300 opponent sampling moves from players up to 2500, which is
// the opposite of the requested behaviour and would look identical from the
// outside (a move comes back either way).
//
// This is the rule that keeps costing us: a wire that does not fire is not a
// wire, and only a test that watches the CALL can tell the difference.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchLichessExplorer = vi.fn();
vi.mock('./lichessExplorerService', () => ({
  fetchLichessExplorer: (...args: unknown[]) => fetchLichessExplorer(...args),
}));

import { pickBookMove } from './coachBookMove';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const explorerResult = {
  white: 500, draws: 200, black: 400, opening: null,
  moves: [
    { uci: 'e2e4', san: 'e4', white: 300, draws: 100, black: 200, averageRating: 1300 },
    { uci: 'd2d4', san: 'd4', white: 200, draws: 100, black: 200, averageRating: 1300 },
  ],
};

describe('the rating band reaches the explorer', () => {
  beforeEach(() => {
    fetchLichessExplorer.mockReset();
    fetchLichessExplorer.mockResolvedValue(explorerResult);
  });

  it('forwards the requested band', async () => {
    await pickBookMove(START, { ratings: '1000,1200', minTotalGames: 20, topN: 6 });
    expect(fetchLichessExplorer).toHaveBeenCalled();
    expect(fetchLichessExplorer.mock.calls[0][2]).toEqual({ ratings: '1000,1200' });
  });

  it('a different band is a different request', async () => {
    await pickBookMove(START, { ratings: '2200,2500', minTotalGames: 20, topN: 6 });
    expect(fetchLichessExplorer.mock.calls[0][2]).toEqual({ ratings: '2200,2500' });
  });

  it('asks for the wide default when no band is given, exactly as before', async () => {
    // The pre-existing theory callers pass no band and must keep their old
    // behaviour — this build must not quietly re-band them.
    await pickBookMove(START, { minTotalGames: 20, topN: 6 });
    expect(fetchLichessExplorer.mock.calls[0][2]).toBeUndefined();
  });

  it('still returns a real, legal move from the banded pool', async () => {
    const picked = await pickBookMove(START, { ratings: '1000,1200', minTotalGames: 20, topN: 6 });
    expect(picked).toBeTruthy();
    expect(['e4', 'd4']).toContain(picked?.san);
  });
});
