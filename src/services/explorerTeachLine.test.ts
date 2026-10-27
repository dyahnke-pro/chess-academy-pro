import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LichessExplorerResult, LichessExplorerMove } from '../types';

// The games database, faked at its one boundary. A plain function, not a
// vi.fn: a vi.fn that rejects fails the test under this Vitest even when the
// code under test catches the rejection, and the fault-injection case needs it
// to reject.
type Fetch = (fen: string, source: string) => Promise<LichessExplorerResult>;
let explorer: Fetch = async () => THIN;
vi.mock('./lichessExplorerService', () => ({
  fetchLichessExplorer: (fen: string, source: string) => explorer(fen, source),
}));

import { Chess } from 'chess.js';
import { buildExplorerBranches, pickMove, pickWalkMove, moverScore } from './explorerTeachLine';

function mv(san: string, white: number, draws: number, black: number): LichessExplorerMove {
  return { uci: '', san, averageRating: 2000, white, draws, black, game: null };
}
function res(white: number, draws: number, black: number, moves: LichessExplorerMove[]): LichessExplorerResult {
  return { white, draws, black, moves, topGames: [], opening: null };
}
const THIN = res(0, 0, 0, []);

/** A fake games database keyed by the position reached by a move list. */
function fakeDb(rows: Record<string, LichessExplorerResult>): Map<string, LichessExplorerResult> {
  const db = new Map<string, LichessExplorerResult>();
  for (const [line, r] of Object.entries(rows)) {
    const c = new Chess();
    for (const san of line.split(' ').filter(Boolean)) c.move(san);
    db.set(c.fen(), r);
  }
  return db;
}

beforeEach(() => { explorer = async () => THIN; });

// The masters after 1.e4 c5 2.a3 (shape of the real 2026-10-27 numbers: 606
// games, …g6 306, …Nc6 121, …e6 110, …Nf6 20).
const A3 = 'e4 c5 a3';
const MASTERS = fakeDb({
  [A3]: res(132, 262, 212, [mv('g6', 60, 140, 106), mv('Nc6', 30, 50, 41), mv('e6', 25, 50, 35), mv('Nf6', 5, 8, 7)]),
  [`${A3} g6`]: res(60, 140, 106, [mv('b4', 30, 50, 51), mv('Nc3', 15, 20, 12)]),
  [`${A3} g6 b4`]: res(30, 50, 51, [mv('Bg7', 30, 50, 50)]),
  [`${A3} g6 b4 Bg7`]: res(30, 50, 50, [mv('Nc3', 4, 3, 2)]),
  [`${A3} g6 b4 Bg7 Nc3`]: res(4, 3, 2, [mv('d6', 2, 1, 1)]),
  [`${A3} Nc6`]: res(30, 50, 41, [mv('b4', 28, 46, 40)]),
  [`${A3} Nc6 b4`]: res(28, 46, 40, [mv('cxb4', 10, 20, 17)]),
  [`${A3} e6`]: res(25, 50, 35, [mv('b4', 25, 45, 30)]),
});

describe('buildExplorerBranches — the masters\' replies become the lesson\'s fork tiles', () => {
  it('offers every reply over the bar, each walked down the masters\' main line', async () => {
    explorer = (async (fen: string, source: string) =>
      source === 'masters' ? (MASTERS.get(fen) ?? THIN) : THIN);
    const r = await buildExplorerBranches(A3.split(' '), 'black');
    expect(r.source).toBe('masters');
    expect(r.incomplete).toBe(false);
    expect(r.results).toEqual({ white: 132, draws: 262, black: 212 });
    // …Nf6 (20 of 606, 3%) is under the share bar; the rest are tiles.
    expect(r.branches.map((b) => b.label)).toEqual(['…g6', '…Nc6', '…e6']);
    const g6 = r.branches[0];
    expect(g6.count).toBe(306);
    expect(g6.totalGames).toBe(606);
    expect(g6.teaserLead).toBe('The most common answer, in 306 of the 606 master games.');
    expect(g6.subtitle).toBe('306 of 606 master games');
    // White's 3.b4 is followed even though White scores badly with it — it is
    // what a Black student will face. The walk stops where the games thin.
    expect(g6.extensionMoves).toEqual(['b4', 'Bg7', 'Nc3']);
    expect(g6.endNote).toBe('The master games run out here: only 9 reached this position.');
    expect(r.branches[1].teaserLead).toBe('Played in 121 of the 606 master games.');
  });

  it('never offers the student a move that loses in practice', async () => {
    const db = fakeDb({ [A3]: res(300, 100, 200, [mv('d5', 200, 50, 50), mv('e6', 100, 50, 150)]) });
    explorer = (async (fen: string, source: string) =>
      source === 'masters' ? (db.get(fen) ?? THIN) : THIN);
    const r = await buildExplorerBranches(A3.split(' '), 'black');
    // …d5 is played most but Black scores 25% with it.
    expect(r.branches.map((b) => b.label)).toEqual(['…e6']);
  });

  it('uses the online games only when the masters never reached the line', async () => {
    const online = fakeDb({ [A3]: res(400, 50, 350, [mv('Nc6', 200, 20, 180), mv('d6', 150, 20, 130)]) });
    explorer = (async (fen: string, source: string) =>
      source === 'masters' ? THIN : (online.get(fen) ?? THIN));
    const r = await buildExplorerBranches(A3.split(' '), 'black');
    expect(r.source).toBe('amateur');
    expect(r.branches.map((b) => b.label)).toEqual(['…Nc6', '…d6']);
    expect(r.branches[0].teaserLead).toContain('online games');
  });

  it('returns no branches when neither database holds the line', async () => {
    explorer = async () => THIN;
    const r = await buildExplorerBranches(A3.split(' '), 'black');
    expect(r).toEqual({ branches: [], source: null, results: null, incomplete: false });
  });

  it('marks the result incomplete when the database fails mid-walk (fault injection)', async () => {
    let calls = 0;
    explorer = ((fen: string, source: string) => {
      calls += 1;
      if (calls > 2) return Promise.reject(new Error('lichess-rate-limited'));
      return Promise.resolve(source === 'masters' ? (MASTERS.get(fen) ?? THIN) : THIN);
    });
    const r = await buildExplorerBranches(A3.split(' '), 'black');
    expect(r.incomplete).toBe(true);
    expect(r.branches.length).toBeGreaterThan(0);
  });

  it('never plays a database move that is illegal from the position', async () => {
    const db = fakeDb({ [A3]: res(100, 100, 100, [mv('Zz9', 100, 100, 100)]) });
    explorer = (async (fen: string, source: string) =>
      source === 'masters' ? (db.get(fen) ?? THIN) : THIN);
    const r = await buildExplorerBranches(A3.split(' '), 'black');
    expect(r.branches).toEqual([]);
  });
});

describe('pickWalkMove — the student is taught sound moves, faces the popular ones', () => {
  const r = res(0, 0, 0, [mv('Qh5', 5, 0, 20), mv('Nf3', 12, 4, 4)]);
  it('the student\'s own move skips the popular loser', () => {
    expect(pickWalkMove(r, 'w', 'w')?.san).toBe('Nf3');
  });
  it('the opponent\'s move is the popular one, sound or not', () => {
    expect(pickWalkMove(r, 'w', 'b')?.san).toBe('Qh5');
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
