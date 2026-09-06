import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LichessExplorerResult, LichessExplorerMove } from '../types';

const explorer = vi.fn();
vi.mock('./lichessExplorerService', () => ({
  fetchLichessExplorer: (fen: string, source: string, opts?: unknown) => explorer(fen, source, opts),
}));

import { buildExplorerTeachLine, pickMove, moverScore } from './explorerTeachLine';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function mv(san: string, white: number, draws: number, black: number): LichessExplorerMove {
  return { uci: '', san, averageRating: 2000, white, draws, black, game: null };
}
function res(white: number, draws: number, black: number, moves: LichessExplorerMove[]): LichessExplorerResult {
  return { white, draws, black, moves, topGames: [], opening: null };
}
const THIN = res(0, 0, 0, []);

beforeEach(() => explorer.mockReset());

describe('buildExplorerTeachLine — masters-first, amateur when thin', () => {
  it('walks the MASTERS line when masters is grounded', async () => {
    const seq = ['e4', 'e5', 'Nf3', 'Nc6'];
    let i = 0;
    explorer.mockImplementation(async (_fen: string, source: string) => {
      if (source !== 'masters') return THIN;
      const san = seq[i]; i += 1;
      return san ? res(50, 30, 20, [mv(san, 40, 20, 10)]) : THIN;
    });

    const line = await buildExplorerTeachLine(START);
    expect(line.sans).toEqual(seq);
    expect(line.segments.every((s) => s.source === 'masters')).toBe(true);
  });

  it('falls to the AMATEUR database when masters is thin (the Traxler case)', async () => {
    const seq = ['e4', 'e5', 'Nf3', 'Nc6'];
    let i = 0;
    explorer.mockImplementation(async (_fen: string, source: string) => {
      if (source === 'masters') return THIN; // nobody plays it at the top
      const san = seq[i]; i += 1;
      return san ? res(300, 200, 300, [mv(san, 120, 80, 120)]) : THIN;
    });

    const line = await buildExplorerTeachLine(START);
    expect(line.sans).toEqual(seq);
    expect(line.segments.every((s) => s.source === 'amateur')).toBe(true);
  });

  it('returns an empty line when NEITHER source is grounded', async () => {
    explorer.mockResolvedValue(THIN);
    const line = await buildExplorerTeachLine(START);
    expect(line.sans).toEqual([]);
    expect(line.endFen).toBe(START);
  });

  it('never plays an explorer SAN that is illegal from the position', async () => {
    // Amateur grounded but returns a garbage SAN — the walk must stop, not throw.
    explorer.mockImplementation(async (_fen: string, source: string) =>
      source === 'masters' ? THIN : res(300, 200, 300, [mv('Zz9', 200, 200, 200)]),
    );
    const line = await buildExplorerTeachLine(START);
    expect(line.sans).toEqual([]);
  });
});

describe('pickMove — data-driven soundness guard (no engine)', () => {
  it('skips a popular-but-losing move for a sounder, less-played one', () => {
    const r = res(0, 0, 0, [
      mv('Qh5', 5, 0, 20), // 25 games, most played, but White scores 20%
      mv('Nf3', 12, 4, 4), // 20 games, White scores 70%
    ]);
    expect(pickMove(r, 'w')?.san).toBe('Nf3');
  });

  it('returns the most-played when nothing clears the floor', () => {
    const r = res(0, 0, 0, [mv('Qh5', 2, 0, 20), mv('Nf3', 1, 0, 8)]);
    expect(pickMove(r, 'w')?.san).toBe('Qh5'); // sound ?? candidates[0]
  });

  it('returns null on an empty result', () => {
    expect(pickMove(THIN, 'w')).toBeNull();
  });
});

describe('moverScore', () => {
  it('scores from the mover perspective', () => {
    expect(moverScore(mv('e4', 10, 0, 0), 'w')).toBe(100);
    expect(moverScore(mv('e4', 0, 0, 10), 'w')).toBe(0);
    expect(moverScore(mv('e4', 4, 2, 4), 'w')).toBe(50);
  });
});
