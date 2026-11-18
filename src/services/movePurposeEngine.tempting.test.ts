// THE ENGINE HALF OF THE BOARD'S TEMPTING MOVE (WO-DANYA-READS-01 group 4):
// `temptingReads` reads the board after each move the eye weighs, so the
// asked position read (chat, "Read this position") can say which natural move
// fails. The engine is replaced by the fixture's own Stockfish reads of those
// boards (depth 12) — the read of the board after a candidate is that
// candidate's line without its first move.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

interface Board { id: string; fen: string; reads: Array<{ evaluation: number; mate: number | null; moves: string[] }> }
const FX = JSON.parse(readFileSync('src/test/fixtures/danya-article-tempting.json', 'utf8')) as Board[];
const B = FX.find((x) => x.id === 'understanding-the-back-rank#4')!;
const boardAfter = (fen: string, uci: string): string => { const c = new Chess(fen); c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); return c.fen(); };
const asked: string[] = [];

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzeWithBudget: vi.fn(async (fen: string) => {
      asked.push(fen);
      const r = B.reads.find((x) => boardAfter(B.fen, x.moves[0]) === fen);
      if (!r) throw new Error('no read for this board');
      return { topLines: [{ rank: 1, evaluation: r.evaluation, mate: r.mate, moves: r.moves.slice(1) }] };
    }),
  },
}));

describe('temptingReads — one read per move the eye weighs', () => {
  it('reads the board after each candidate and hands the one computer what it needs', async () => {
    const { temptingReads } = await import('./movePurposeEngine');
    const { temptingOnBoard, candidateMoves } = await import('./weighedMoves');
    const reads = await temptingReads(B.fen, 1500, B.reads[0]);
    expect(reads?.[0].moves[0]).toBe(B.reads[0].moves[0]);
    // Every move the eye weighs, the best excepted, was asked about.
    const eye = candidateMoves(B.fen, 1500, { played: null, scored: null }).map((c) => c.uci).filter((u) => u !== B.reads[0].moves[0]);
    expect(asked.length).toBe(eye.length);
    const t = temptingOnBoard({ fen: B.fen, student: 'w', rating: 1500, reads: reads ?? [], priorMove: null })[0];
    expect(t?.text).toBe('Nd4 is tempting here, but it fails: they play Rxe1+, you answer Qxe1 and they play Rxd4 — they win a knight.');
  }, 120_000);

  it('a finished game asks the engine nothing', async () => {
    const { temptingReads } = await import('./movePurposeEngine');
    asked.length = 0;
    expect(await temptingReads('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1', 1500, null)).toBeNull();
    expect(asked).toEqual([]);
  }, 120_000);
});
