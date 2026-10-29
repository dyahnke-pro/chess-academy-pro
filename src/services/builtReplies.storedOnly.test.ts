// A page's replies read the games that built its line — the stored trees —
// never the live explorer (2026-10-29 prod audit). Live, the reply tree's
// dozens of boards came out by whether Lichess answered, and its boards were
// ones the tab's plan could not read.
import { describe, it, expect, vi } from 'vitest';
import type { LichessExplorerResult } from '../types';
import { buildOpeningRecord } from '../test/factories';
import { MAIN_LINE_INDEX } from '../utils/wlppLadder';
import { builtRepliesFor } from './builtReplies';

function result(moves: Array<[string, number]>): LichessExplorerResult {
  const rows = moves.map(([san, n]) => ({ san, uci: '', white: Math.round(n * 0.4), draws: Math.round(n * 0.3), black: n - Math.round(n * 0.4) - Math.round(n * 0.3), averageRating: 2500 }));
  const total = rows.reduce((a, m) => a + m.white + m.draws + m.black, 0);
  return { white: Math.round(total * 0.4), draws: Math.round(total * 0.3), black: total - Math.round(total * 0.4) - Math.round(total * 0.3), moves: rows, topGames: [] } as unknown as LichessExplorerResult;
}
// The Najdorf page (the student's own …a6 names it): the stored trees hold
// White's sixth move with one real alternative.
const TREE: Record<string, Array<[string, number]>> = {
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': [['Be3', 400], ['Bg5', 300]],
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5': [['e6', 280]],
};
vi.mock('./masterTree', () => ({
  masterTreeAt: (sans: readonly string[]): Promise<LichessExplorerResult | null> => {
    const m = TREE[sans.join(' ')];
    return Promise.resolve(m ? result(m) : null);
  },
  onlineTreeAt: (): Promise<LichessExplorerResult | null> => Promise.resolve(null),
}));
const liveReads: string[] = [];
vi.mock('./lichessExplorerService', () => ({
  fetchLichessExplorer: (fen: string): Promise<LichessExplorerResult> => {
    liveReads.push(fen);
    return Promise.resolve(result([['h3', 900], ['f3', 500], ['Be2', 400]]));
  },
}));

describe('builtRepliesFor — the stored trees only', () => {
  it('lists the replies the stored games hold and never asks Lichess', async () => {
    const najdorf = buildOpeningRecord({ id: 'najdorf-stored', name: 'Sicilian Defense: Najdorf Variation', pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3', color: 'black', variations: null });
    const replies = await builtRepliesFor(najdorf, MAIN_LINE_INDEX);
    expect(replies.map((r) => r.moves[r.atPly])).toEqual(['Bg5']);
    expect(liveReads).toEqual([]);
  });
});
