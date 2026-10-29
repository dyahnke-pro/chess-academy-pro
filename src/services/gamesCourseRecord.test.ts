import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import type { LichessExplorerResult } from '../types';
import { buildOpeningRecord } from '../test/factories';
import { gamesCourseRecord } from './gamesCourseRecord';

// A fixture tree: the Mengarini line with one real split at ply 3.
function row(san: string, n: number): LichessExplorerResult['moves'][number] {
  return { san, uci: '', white: Math.round(n * 0.4), draws: Math.round(n * 0.3), black: n - Math.round(n * 0.4) - Math.round(n * 0.3), averageRating: 2500 } as LichessExplorerResult['moves'][number];
}
const TREE: Record<string, Array<[string, number]>> = {
  'e4 c5 a3': [['g6', 300], ['Nc6', 150]],
  'e4 c5 a3 g6': [['b4', 200]],
  'e4 c5 a3 g6 b4': [['Bg7', 180]],
  'e4 c5 a3 Nc6': [['Nc3', 100]],
};
const lookups: string[] = [];
vi.mock('./masterTree', () => ({
  masterTreeAt: (sans: readonly string[]): Promise<LichessExplorerResult | null> => {
    lookups.push(sans.join(' '));
    const moves = (TREE[sans.join(' ')] ?? []).map(([s, n]) => row(s, n));
    const total = moves.reduce((a, m) => a + m.white + m.draws + m.black, 0);
    return Promise.resolve(moves.length ? { white: Math.round(total * 0.4), draws: Math.round(total * 0.3), black: total - Math.round(total * 0.4) - Math.round(total * 0.3), moves, topGames: [] } as unknown as LichessExplorerResult : null);
  },
  // The stored online tree (O9) holds nothing here.
  onlineTreeAt: (): Promise<LichessExplorerResult | null> => Promise.resolve(null),
}));
// The live explorer would answer every board with strong online games: the
// page must never ask it (2026-10-29 prod audit — the Paris Gambit built nine
// tabs from live games or handed off, by whether Lichess answered).
const liveReads: string[] = [];
vi.mock('./lichessExplorerService', () => ({
  fetchLichessExplorer: (fen: string): Promise<LichessExplorerResult> => {
    liveReads.push(fen);
    const moves = [row('Bxh3', 400), row('Nc6', 200)];
    return Promise.resolve({ white: 240, draws: 180, black: 180, moves, topGames: [] } as unknown as LichessExplorerResult);
  },
}));
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { analyzePosition: (): Promise<{ evaluation: number }> => Promise.resolve({ evaluation: 20 }) },
}));

describe('gamesCourseRecord — the page view of a database-only opening', () => {
  beforeEach(() => { lookups.length = 0; liveReads.length = 0; });

  it('runs the main line on from the tree, adds the split as a tab, teaches the seat the name gives', async () => {
    const raw = buildOpeningRecord({ id: 'mengarini', name: 'Sicilian Defense: Mengarini Variation', pgn: 'e4 c5 a3', color: 'white', variations: null });
    const r = (await gamesCourseRecord(raw))!;
    expect(r.color).toBe('black');
    expect(r.pgn.startsWith('e4 c5 a3 g6 b4 Bg7')).toBe(true);
    expect(r.variations?.map((v) => v.pgn.split(' ').slice(0, 4).join(' '))).toEqual(['e4 c5 a3 Nc6']);
    // Every move is legal from the start (G3: real moves, replayed).
    const c = new Chess();
    for (const s of r.pgn.split(' ')) c.move(s);
  });

  it("keeps the record's own progress on every reload and builds the course once", async () => {
    const raw = buildOpeningRecord({ id: 'mengarini-2', name: 'Sicilian Defense: Mengarini Variation', pgn: 'e4 c5 a3', variations: null, linesDiscovered: [] });
    await gamesCourseRecord(raw);
    const before = lookups.length;
    const again = (await gamesCourseRecord({ ...raw, linesDiscovered: [-1] }))!;
    expect(again.linesDiscovered).toEqual([-1]);
    expect(lookups.length).toBe(before);
  });

  it('null when the tree holds nothing past the named line (the page hands off as before)', async () => {
    expect(await gamesCourseRecord(buildOpeningRecord({ id: 'grob', name: 'Grob Opening', pgn: 'g4', variations: null }))).toBeNull();
  });

  it('reads the stored trees only: a line only Lichess holds hands off, the same every time', async () => {
    const paris = await gamesCourseRecord(buildOpeningRecord({ id: 'paris', name: 'Amar Opening: Paris Gambit', pgn: 'Nh3 d5 g3 e5 f4', variations: null }));
    expect(paris).toBeNull();
    // The Mengarini's line stops where the stored games stop (Bg7), never on
    // a live read past it.
    const meng = (await gamesCourseRecord(buildOpeningRecord({ id: 'mengarini-3', name: 'Sicilian Defense: Mengarini Variation', pgn: 'e4 c5 a3', variations: null })))!;
    expect(meng.pgn).toBe('e4 c5 a3 g6 b4 Bg7');
    expect(liveReads).toEqual([]);
  });
});
