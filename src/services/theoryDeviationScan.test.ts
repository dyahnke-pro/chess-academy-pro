import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanTheoryDeviation } from './theoryDeviationScan';
import { lookupMasterPlay } from './masterPlayLookup';
import type { MasterPlayResult, MasterPlayMove } from './masterPlayTypes';

vi.mock('./masterPlayLookup', () => ({ lookupMasterPlay: vi.fn() }));
const mocked = vi.mocked(lookupMasterPlay);

function m(san: string, games: number): MasterPlayMove {
  return { san, games, white: games, draws: 0, black: 0, whitePct: 1, drawPct: 0, blackPct: 0 };
}
function res(moves: MasterPlayMove[], source: MasterPlayResult['source'] = 'local'): MasterPlayResult {
  return { fen: 'x', totalGames: moves.reduce((s, x) => s + x.games, 0), moves, source };
}

beforeEach(() => mocked.mockReset());

describe('scanTheoryDeviation', () => {
  it('flags the first White move not in the masters set', async () => {
    // White to move on plies 0, 2, 4. Book has e4 then Nf3; on ply 4 White
    // plays a3 which is NOT a master move → deviation at ply 4 (move 3).
    mocked.mockImplementation(async (fen: string) => {
      void fen;
      const call = mocked.mock.calls.length;
      if (call === 1) return res([m('e4', 1000), m('d4', 800)]);
      if (call === 2) return res([m('Nf3', 900), m('Nc3', 100)]);
      return res([m('Bb5', 500), m('Bc4', 300)]); // a3 not here
    });

    const dev = await scanTheoryDeviation('e4 e5 Nf3 Nc6 a3', 'white');
    expect(dev).not.toBeNull();
    expect(dev!.ply).toBe(4);
    expect(dev!.moveNumber).toBe(3);
    expect(dev!.playedSan).toBe('a3');
    expect(dev!.mastersTop.san).toBe('Bb5');
    expect(dev!.mastersTop.popularity).toBe('the main move');
  });

  it('returns null when the player stays in book until coverage ends', async () => {
    // First White move e4 is in book; second lookup has no data (source
    // none) → coverage ran out, no deviation found. Good result.
    mocked
      .mockResolvedValueOnce(res([m('e4', 1000)]))
      .mockResolvedValueOnce(res([], 'none'));
    const dev = await scanTheoryDeviation('e4 e5 Nf3', 'white');
    expect(dev).toBeNull();
  });

  it('scans Black moves at odd plies', async () => {
    // Black to move on ply 1, 3. Book replies ...c5 first; on ply 3 Black
    // plays ...Qh4 not in book → deviation at ply 3 (move 2).
    mocked.mockImplementation(async () => {
      const call = mocked.mock.calls.length;
      if (call === 1) return res([m('c5', 1000), m('e5', 900)]);
      return res([m('d6', 500), m('Nc6', 400)]); // Qh4 not here
    });
    const dev = await scanTheoryDeviation('e4 c5 Nf3 Qh4', 'black');
    expect(dev!.ply).toBe(3);
    expect(dev!.playedSan).toBe('Qh4');
  });

  it('returns null on a garbled pgn token rather than guessing', async () => {
    mocked.mockResolvedValue(res([m('e4', 1000)]));
    const dev = await scanTheoryDeviation('e4 zz9', 'white');
    expect(dev).toBeNull();
  });
});
