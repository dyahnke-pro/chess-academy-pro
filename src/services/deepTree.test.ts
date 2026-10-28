import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LichessExplorerResult } from '../types';

const res = (n: number): LichessExplorerResult => ({ white: n, draws: 0, black: 0, moves: [], topGames: [] } as unknown as LichessExplorerResult);
let tree: LichessExplorerResult | null = null;
const explorer = vi.fn();
vi.mock('./masterTree', () => ({ masterTreeAt: (): Promise<LichessExplorerResult | null> => Promise.resolve(tree) }));
vi.mock('./lichessExplorerService', () => ({ fetchLichessExplorer: (...a: unknown[]): unknown => explorer(...a) }));

const { deepTreeAnswer, STRONG_ONLINE_RATINGS } = await import('./deepTree');
const LINE = ['e4', 'c5', 'a3'];

describe('deepTreeAnswer — masters first, strong online games past them', () => {
  beforeEach(() => { tree = null; explorer.mockReset(); });

  it('the masters while the tree reached the board — no live read', async () => {
    tree = res(40);
    expect((await deepTreeAnswer(LINE))?.source).toBe('masters');
    expect(explorer).not.toHaveBeenCalled();
  });

  it('past the tree, the masters\' own database before anything else', async () => {
    explorer.mockImplementation((_fen: string, db: string) => Promise.resolve(db === 'masters' ? res(25) : res(900)));
    expect((await deepTreeAnswer(LINE))?.source).toBe('masters');
    expect(explorer).toHaveBeenCalledTimes(1);
  });

  it('where the masters run out, strong online games (2200+) carry the line on', async () => {
    tree = res(4);
    explorer.mockResolvedValue(res(300));
    const a = await deepTreeAnswer(LINE);
    expect(a?.source).toBe('online');
    expect(explorer).toHaveBeenCalledWith(expect.any(String), 'lichess', { ratings: STRONG_ONLINE_RATINGS });
  });

  it('nobody played on: the masters\' few, or nothing', async () => {
    tree = res(4);
    explorer.mockResolvedValue(res(3));
    expect((await deepTreeAnswer(LINE))?.result.white).toBe(4);
    tree = null;
    explorer.mockResolvedValue(res(0));
    expect(await deepTreeAnswer(LINE)).toBeNull();
  });

  it('a read that fails throws, so a builder never keeps a thinner line', async () => {
    tree = res(4);
    explorer.mockRejectedValue(new Error('lichess-rate-limited'));
    await expect(deepTreeAnswer(LINE)).rejects.toThrow();
  });
});
