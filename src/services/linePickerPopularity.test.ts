// The picker's ORDER is a teaching claim: the student reads the top tile as
// "this is what people play". The taxonomy count it used to rank by measures
// how finely theory has subdivided a line, not how often anyone plays it — so
// a heavily-catalogued sideline could sit above a common main line and the
// ordering asserted something it had no data for.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchLichessExplorer = vi.fn();
vi.mock('./lichessExplorerService', () => ({
  fetchLichessExplorer: (...a: unknown[]) => fetchLichessExplorer(...a),
}));

import { rankByPopularity, popularityLabel } from './linePickerPopularity';
import type { LinePickerOption } from './openingDetectionService';

const opt = (label: string, keyMove: string): LinePickerOption => ({
  label, fullName: `Sicilian Defense: ${label}`, eco: 'B20', style: 'sharp',
  pgnLength: 6, studentSide: 'black', leadingSide: 'white', keyMove,
});

// A Sicilian picker: the student has played 1.e4 c5 and these are the replies.
const OPTIONS = [opt('Alapin', '3.c3'), opt('Open', '3.Nf3'), opt('Closed', '3.Nc3')];
const SICILIAN = 'e4 c5';

const moves = (rows: Array<[string, number]>) => ({
  white: 0, draws: 0, black: 0, opening: null,
  moves: rows.map(([san, n]) => ({ san, uci: '', white: n, draws: 0, black: 0, averageRating: 1300 })),
});

describe('rankByPopularity', () => {
  beforeEach(() => { fetchLichessExplorer.mockReset(); });

  it('puts the most-played line first, whatever order it arrived in', async () => {
    fetchLichessExplorer.mockResolvedValue(moves([['Nf3', 700], ['c3', 200], ['Nc3', 100]]));
    const ranked = await rankByPopularity(OPTIONS, SICILIAN, 1300);
    expect(ranked.map((o) => o.label)).toEqual(['Open', 'Alapin', 'Closed']);
    expect(ranked[0].playedPct).toBe(70);
  });

  it('asks for the student\'s own band, not every rating at once', async () => {
    fetchLichessExplorer.mockResolvedValue(moves([['Nf3', 10]]));
    await rankByPopularity(OPTIONS, SICILIAN, 1300);
    const band = (fetchLichessExplorer.mock.calls[0][2] as { ratings: string }).ratings;
    expect(band).toBe('1200,1400');
    // A weaker student must get a weaker sample, or the band is decoration.
    fetchLichessExplorer.mockClear();
    await rankByPopularity(OPTIONS, SICILIAN, 1000);
    expect((fetchLichessExplorer.mock.calls[0][2] as { ratings: string }).ratings).toBe('1000,1200');
  });

  it('an unknown line is not a zero-popularity line', async () => {
    // Only two of three have games. The third must keep its place BEHIND the
    // measured ones without being called unpopular — demoting it below a
    // measured 0.1% would be a claim the data does not support.
    fetchLichessExplorer.mockResolvedValue(moves([['Nf3', 900], ['c3', 1]]));
    const ranked = await rankByPopularity(OPTIONS, SICILIAN, 1300);
    expect(ranked.map((o) => o.label)).toEqual(['Open', 'Alapin', 'Closed']);
    expect(ranked[2].playedPct, 'unknown reported as zero').toBeNull();
    expect(ranked[2].games).toBeNull();
  });

  it('leaves the order alone when the explorer fails', async () => {
    // Rate-limited, circuit open, offline. The picker must look exactly as it
    // does today rather than reshuffle or empty.
    fetchLichessExplorer.mockRejectedValue(new Error('lichess-rate-limited'));
    const ranked = await rankByPopularity(OPTIONS, SICILIAN, 1300);
    expect(ranked.map((o) => o.label)).toEqual(['Alapin', 'Open', 'Closed']);
    expect(ranked.every((o) => o.playedPct === null)).toBe(true);
  });

  it('leaves the order alone when the explorer knows nothing', async () => {
    fetchLichessExplorer.mockResolvedValue(moves([]));
    const ranked = await rankByPopularity(OPTIONS, SICILIAN, 1300);
    expect(ranked.map((o) => o.label)).toEqual(['Alapin', 'Open', 'Closed']);
  });

  it('survives a PGN it cannot play out, without calling the network', async () => {
    const ranked = await rankByPopularity(OPTIONS, 'e4 e9 Qz3', 1300);
    expect(ranked).toHaveLength(3);
    expect(fetchLichessExplorer).not.toHaveBeenCalled();
  });

  it('reads a display keyMove — move number and ellipsis and all', async () => {
    // keyMove is authored for the eye ("5...a6"); the explorer keys on bare SAN.
    fetchLichessExplorer.mockResolvedValue(moves([['a6', 500], ['Nf3', 100]]));
    const ranked = await rankByPopularity([opt('Najdorf', '5...a6'), opt('Open', '3.Nf3')], SICILIAN, 1300);
    expect(ranked[0].label).toBe('Najdorf');
    expect(ranked[0].games).toBe(500);
  });
});

describe('popularityLabel — silence beats a misleading number', () => {
  it('quotes a real share', () => {
    expect(popularityLabel({ playedPct: 42.5, games: 900 })).toBe('42.5% at your level');
  });

  it('says nothing when there is no data', () => {
    expect(popularityLabel({ playedPct: null, games: null })).toBe('');
  });

  it('says nothing on a sample too thin to quote at anyone', () => {
    expect(popularityLabel({ playedPct: 33.3, games: 3 })).toBe('');
  });

  it('reports a floor rather than a 0.0% that reads as "nobody plays this"', () => {
    expect(popularityLabel({ playedPct: 0.04, games: 40 })).toBe('under 0.1% at your level');
  });
});
