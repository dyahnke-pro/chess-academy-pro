// THE REVIEW STORES ONE READ PER CANDIDATE A PLAYER WEIGHS (weighedMoves,
// 2026-11-05). On his 7…Ng4 (8urm2D1HhX8): one wide read scores every legal
// move, the human model picks the moves a player weighs, and one fan reads
// each of them — so Review can say …Nxe4 fails to dxe4. Before this the
// record kept the best line and the played line only (the engine's top one or
// two), and …Nxe4, 25th in the engine's order, was never read.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { weighedReads } from './gameAnalysisService';
import { temptingRefuted, type WeighRead } from './weighedMoves';

interface Fixture { video: string; fenBefore: string; played: string; reads: WeighRead[] }
const G = (JSON.parse(readFileSync('src/test/fixtures/danya-weighed-reads.json', 'utf8')) as Fixture[]).find((x) => x.video === '8urm2D1HhX8')!;

describe('weighedReads (the review\'s per-candidate reads)', () => {
  it('reads every legal move wide, then the candidates at depth, and keeps their lines', async () => {
    const calls: Array<{ lines: number; searchmoves: readonly string[] | null }> = [];
    const board = new Chess(G.fenBefore);
    const legal = board.moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
    const byUci = new Map(G.reads.map((r) => [r.moves[0], r]));
    // A fake pooled engine: the wide read scores every legal move (the moves
    // the fixture has no read for score like the worst it has), the fan
    // answers from the fixture's depth-14 reads.
    const worker = {
      analyzeFan: async (_fen: string, lines: number, depth: number, _budget: number, searchmoves: readonly string[] | null) => {
        calls.push({ lines, searchmoves });
        const worst = Math.min(...G.reads.map((r) => r.evaluation));
        const ucis = searchmoves ?? legal;
        return ucis.map((u, i) => {
          const r = byUci.get(u);
          return { rank: i + 1, evaluation: r ? r.evaluation : worst, mate: r ? r.mate : null, bound: null, moves: r ? [...r.moves] : [u], depth };
        });
      },
    };
    const stored = await weighedReads(G.fenBefore, G.played, async () => worker as never, 1000);
    expect(calls[0]).toEqual({ lines: legal.length, searchmoves: null });
    expect(calls[1].searchmoves).toContain('f6e4');
    expect(stored?.reads.map((r) => r.moves[0])).toEqual(expect.arrayContaining(['f6g4', 'f6e4']));
    expect(stored?.depth).toBe(16);
    // …and those reads are what Review's computer says the refutation from.
    expect(temptingRefuted({ fenBefore: G.fenBefore, san: G.played, student: 'b', rating: 1500, reads: stored!.reads, priorMove: null })?.text)
      .toBe('Nxe4 is tempting here, but it fails: they play dxe4 — they win a knight for a pawn.');
  });

  it('no engine, no reads — never a guessed record', async () => {
    expect(await weighedReads(G.fenBefore, 'Nd7', async () => null, 1000)).toBeNull();
  });
});
