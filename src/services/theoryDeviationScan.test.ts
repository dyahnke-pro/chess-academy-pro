import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanTheoryDeviation } from './theoryDeviationScan';
import { lookupMasterPlay } from './masterPlayLookup';
import { lookupAmateurPlay } from './amateurPlayLookup';
import type { MasterPlayResult, MasterPlayMove } from './masterPlayTypes';

vi.mock('./masterPlayLookup', () => ({ lookupMasterPlay: vi.fn() }));
vi.mock('./amateurPlayLookup', () => ({ lookupAmateurPlay: vi.fn() }));
const mocked = vi.mocked(lookupMasterPlay);
const amateurMock = vi.mocked(lookupAmateurPlay);

function m(san: string, games: number): MasterPlayMove {
  return { san, games, white: games, draws: 0, black: 0, whitePct: 1, drawPct: 0, blackPct: 0 };
}
/** A move with a game count but NO W/D/L split (sparse local masters file). */
function countOnly(san: string, games: number): MasterPlayMove {
  return { san, games, white: 0, draws: 0, black: 0, whitePct: 0, drawPct: 0, blackPct: 0 };
}
/** A move with a full W/D/L split (amateur DB shape). */
function wdl(san: string, white: number, draws: number, black: number): MasterPlayMove {
  const games = white + draws + black;
  return { san, games, white, draws, black, whitePct: white / games, drawPct: draws / games, blackPct: black / games };
}
function res(moves: MasterPlayMove[], source: MasterPlayResult['source'] = 'local'): MasterPlayResult {
  return { fen: 'x', totalGames: moves.reduce((s, x) => s + x.games, 0), moves, source };
}
const none: MasterPlayResult = { fen: 'x', totalGames: 0, moves: [], source: 'none' };

beforeEach(() => {
  mocked.mockReset();
  amateurMock.mockReset();
  // Default: amateur has nothing unless a test says otherwise.
  amateurMock.mockResolvedValue(none);
});

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
    expect(dev!.source).toBe('masters');
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

  it('matches an in-book move whose SAN glyph differs (no false "left book")', async () => {
    // Black's mating move is stored as "Qh4#" but the masters set spells
    // it "Qh4" (no glyph). A raw `san ===` would miss it and falsely flag
    // a deviation; position-compare matches → no deviation (David 2026-06-27).
    mocked.mockImplementation(async () => {
      const call = mocked.mock.calls.length;
      if (call === 1) return res([m('e5', 1000)]);      // ...e5 in book
      return res([m('Qh4', 1000)]);                      // ...Qh4 (no #) in book
    });
    const dev = await scanTheoryDeviation('f4 e5 g4 Qh4#', 'black');
    expect(dev).toBeNull();
  });

  it('handles black-continuation move numbers (1...e5) in the pgn', async () => {
    mocked.mockResolvedValueOnce(res([m('e4', 1000)])).mockResolvedValueOnce(none);
    const dev = await scanTheoryDeviation('1. e4 e5 2. Nf3', 'white');
    expect(dev).toBeNull();
  });

  it('extends the scan with the AMATEUR db when masters coverage runs out', async () => {
    // Ply 0 (e4) in masters book. Ply 2 (a3): masters has NOTHING here →
    // fall to amateur, which has data but a3 is not among it → amateur-
    // sourced deviation (David 2026-06-28: amateur in conjunction).
    mocked.mockResolvedValueOnce(res([m('e4', 1000)])).mockResolvedValueOnce(none);
    amateurMock.mockResolvedValue(res([wdl('Nf3', 600, 200, 200), wdl('Bc4', 300, 100, 100)], 'lichess-live'));
    const dev = await scanTheoryDeviation('e4 e5 a3', 'white');
    expect(dev).not.toBeNull();
    expect(dev!.ply).toBe(2);
    expect(dev!.playedSan).toBe('a3');
    expect(dev!.source).toBe('amateur');
    expect(dev!.mastersTop.san).toBe('Nf3');
  });

  it('stays in book when masters is out but the move is common in the amateur db', async () => {
    // Masters out at ply 2, but a3 IS a common amateur move → not a
    // deviation; the scan keeps going and finds nothing.
    mocked.mockResolvedValueOnce(res([m('e4', 1000)])).mockResolvedValue(none);
    amateurMock.mockResolvedValue(res([wdl('a3', 500, 200, 200)], 'lichess-live'));
    const dev = await scanTheoryDeviation('e4 e5 a3', 'white');
    expect(dev).toBeNull();
  });

  it('borrows amateur W/D/L when the masters move is count-only (no "untested")', async () => {
    // Ply 2 deviation: masters top (Bb5) has a game count but no result
    // split. enrichScore fills the score from amateur's same move.
    mocked.mockImplementation(async () => {
      const call = mocked.mock.calls.length;
      if (call === 1) return res([m('e4', 1000)]);
      if (call === 2) return res([m('Nf3', 900)]);
      return res([countOnly('Bb5', 5000), countOnly('Bc4', 3000)]); // a3 not here, no W/D/L
    });
    amateurMock.mockResolvedValue(res([wdl('Bb5', 3000, 1000, 1000)], 'lichess-live'));
    const dev = await scanTheoryDeviation('e4 e5 Nf3 Nc6 a3', 'white');
    expect(dev).not.toBeNull();
    expect(dev!.source).toBe('masters');
    expect(dev!.mastersTop.san).toBe('Bb5');
    // Score is no longer 'untested' — borrowed from amateur (60% white).
    expect(dev!.mastersTop.score).not.toBe('untested');
    expect(dev!.mastersTop.sentence).not.toContain('untested');
  });
});
