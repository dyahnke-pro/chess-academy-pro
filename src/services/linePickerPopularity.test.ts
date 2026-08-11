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

/** `pgn` is what matters now: a line is located by where it LEAVES the trunk,
 *  not by the move that names it. `keyMove` is display text and stays. */
const opt = (label: string, pgn: string, keyMove = ''): LinePickerOption => ({
  label, fullName: `Sicilian Defense: ${label}`, eco: 'B20', style: 'sharp',
  pgnLength: pgn.split(' ').length, pgn, studentSide: 'black',
  leadingSide: 'white', keyMove,
});

// A Sicilian picker: the student has played 1.e4 c5 and these are the replies.
const OPTIONS = [
  opt('Alapin', 'e4 c5 c3'),
  opt('Open', 'e4 c5 Nf3'),
  opt('Closed', 'e4 c5 Nc3'),
];
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

  it('locates a DEEP line by where it leaves the trunk, not by its name move', async () => {
    // 🔒 THE BUG THE PROD AUDIT CAUGHT. Matching on the naming move returned
    // zero captions on a real Sicilian picker: the Najdorf is named by …a6 at
    // ply 9 of `e4 c5`, which is not a continuation of that position, so the
    // explorer has no entry for it. Located by its BRANCH move (Nf3) it is
    // found — the assumption was wrong, not the plumbing.
    fetchLichessExplorer.mockResolvedValue(moves([['Nf3', 700], ['c3', 300]]));
    const ranked = await rankByPopularity(
      [opt('Alapin', 'e4 c5 c3'), opt('Najdorf', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', '5...a6')],
      SICILIAN, 1300,
    );
    const najdorf = ranked.find((o) => o.label === 'Najdorf');
    expect(najdorf?.games, 'a deep line found by its branch move').toBe(700);
  });

  it('asks at the position where the lines actually PART, not the family root', async () => {
    // 🔒 THE LIVE PROD PICKER THAT FORCED THIS. The Sicilian offered exactly
    // three tiles — Dragon, Najdorf, Richter-Rauzer — and all three run
    // `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3` before they differ. Asked at `e4 c5`
    // every branch move is Nf3, the shared-branch rule refuses all three, and
    // the feature does nothing for the case it exists to serve.
    fetchLichessExplorer.mockResolvedValue(moves([['a6', 600], ['g6', 300], ['e6', 100]]));
    const spine = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3';
    const ranked = await rankByPopularity(
      [opt('Dragon', `${spine} g6`), opt('Najdorf', `${spine} a6`)],
      SICILIAN, 1300,
    );
    expect(ranked[0].label, 'the more-played line should lead').toBe('Najdorf');
    expect(ranked[0].games).toBe(600);
    expect(ranked.find((o) => o.label === 'Dragon')?.games).toBe(300);
  });

  it('never asks ABOVE the family — that would be a different opening', async () => {
    // A single option cannot drag the trunk out of its own family.
    fetchLichessExplorer.mockResolvedValue(moves([['Nf3', 500]]));
    await rankByPopularity([opt('Open', 'e4 c5 Nf3')], SICILIAN, 1300);
    const askedFen = fetchLichessExplorer.mock.calls[0][0];
    expect(askedFen, 'the trunk left the Sicilian').toContain('2p5'); // black pawn on c5
  });

  it('a SHARED branch earns no number on either tile', async () => {
    // The Najdorf and the Dragon both leave `e4 c5` by Nf3. Putting Nf3's share
    // on both would tell the student two different lines are each played 70% of
    // the time — false twice over, and worse than saying nothing.
    fetchLichessExplorer.mockResolvedValue(moves([['Nf3', 700], ['c3', 300]]));
    const ranked = await rankByPopularity(
      [
        opt('Najdorf', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'),
        opt('Dragon', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6'),
        opt('Alapin', 'e4 c5 c3'),
      ],
      SICILIAN, 1300,
    );
    expect(ranked.find((o) => o.label === 'Najdorf')?.games, 'shared branch claimed').toBeNull();
    expect(ranked.find((o) => o.label === 'Dragon')?.games, 'shared branch claimed').toBeNull();
    // The one that branches alone still gets its real share.
    expect(ranked.find((o) => o.label === 'Alapin')?.games).toBe(300);
  });

  it('a line that IS the trunk gets no number', async () => {
    fetchLichessExplorer.mockResolvedValue(moves([['Nf3', 700]]));
    const ranked = await rankByPopularity([opt('Bare', 'e4 c5')], SICILIAN, 1300);
    expect(ranked[0].games).toBeNull();
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
