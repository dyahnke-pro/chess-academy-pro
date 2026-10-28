// The deep master tree on the phone (WO-ALL-OPENINGS-01 P1): the file is
// picked by the board six moves in, and a board's rows read as the explorer's answer.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { treeFileFor, rowsToResult } from './masterTree';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('treeFileFor', () => {
  // The board after 1.e4 c5 2.Nf3 d6 3.d4 cxd4.
  const index = { pre: 6, boards: { 'rnbqkbnr/pp2pppp/3p4/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq -': 3 } };
  it('the first six moves live in the root file', () => {
    expect(treeFileFor(index, ['e4', 'c5', 'Nf3'])).toBe('root');
  });
  it('a deeper board lives in the file of the board six moves in', () => {
    expect(treeFileFor(index, ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'])).toBe('s3');
  });
  it('another move order into the same six-move board finds the same file', () => {
    expect(treeFileFor(index, ['Nf3', 'c5', 'e4', 'd6', 'd4', 'cxd4', 'Nxd4'])).toBe('s3');
  });
  it('a board masters never reached has no file — the walk asks the live explorer', () => {
    expect(treeFileFor(index, ['e4', 'c5', 'a3', 'Nc6', 'b4', 'cxb4', 'axb4'])).toBeNull();
  });
});

describe('boardHash', () => {
  it('is the shard script\'s FNV-1a (the pinned vector)', async () => {
    const { boardHash } = await import('./masterTree');
    expect(boardHash('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -')).toBe('44941583');
  });
});

describe('rowsToResult', () => {
  it('reads rows as the explorer does, totals from the moves, illegal rows dropped', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const r = rowsToResult(start, [['e4', 100, 40, 35, 25, 2450], ['d4', 80, 30, 40, 10, 2470], ['Qh5', 1, 0, 0, 1, 2200], ['Nf3', 3, 1, 1, 1, 2300]])!;
    expect(r.moves.map((m) => m.san)).toEqual(['e4', 'd4', 'Nf3']);
    expect(r.moves[0]).toMatchObject({ uci: 'e2e4', white: 40, draws: 35, black: 25, averageRating: 2450 });
    expect(r.white + r.draws + r.black).toBe(183);
  });
});

describe('masterTreeAt', () => {
  it('fetches the index, then the file the path picks, and answers the board', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      const body = url.endsWith('index.json')
        ? { source: 't', min: 10, stop: 40, pre: 6, boards: {} }
        : { 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [['c5', 50, 20, 15, 15, 2500]] };
      return { ok: true, json: async () => body } as Response;
    });
    const { masterTreeAt } = await import('./masterTree');
    const r = await masterTreeAt(['e4']);
    expect(r?.moves[0].san).toBe('c5');
    expect(urls).toEqual(['/data/master-tree/index.json', '/data/master-tree/root.json']);
  });
  it('a late transposition is found through the board\'s hash bucket', async () => {
    // 1.c4 Nf6 2.Nc3 g6 3.e4 Bg7 4.d4 — the King's Indian by the English order:
    // the board after move 6 has no file of its own; the board lives in s7.
    const kid = 'rnbqk2r/ppppppbp/5np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR b KQkq -';
    const { boardHash } = await import('./masterTree');
    const h = boardHash(kid);
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      const body = url.endsWith('index.json') ? { source: 't', min: 10, stop: 40, pre: 6, boards: {} }
        : url.endsWith(`/h/${h.slice(0, 2)}.json`) ? { [h.slice(2)]: 7 }
          : url.endsWith('/s7.json') ? { [kid]: [['d6', 900, 300, 350, 250, 2550]] }
            : null;
      return body ? { ok: true, json: async () => body } as Response : { ok: false, json: async () => null } as unknown as Response;
    });
    const { masterTreeAt } = await import('./masterTree');
    const r = await masterTreeAt(['c4', 'Nf6', 'Nc3', 'g6', 'e4', 'Bg7', 'd4']);
    expect(r?.moves[0].san).toBe('d6');
    expect(urls.some((u) => u.endsWith(`/h/${h.slice(0, 2)}.json`))).toBe(true);
  });
  it('null when the files cannot be read — never a throw', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    const { masterTreeAt } = await import('./masterTree');
    expect(await masterTreeAt(['e4'])).toBeNull();
  });
});
