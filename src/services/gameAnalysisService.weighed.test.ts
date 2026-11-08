// THE REVIEW STORES ONE READ PER CANDIDATE A PLAYER WEIGHS (weighedMoves,
// 2026-11-05). On his 7…Ng4 (8urm2D1HhX8): one wide read scores every legal
// move, the human model picks the moves a player weighs, and one fan reads
// each of them — so Review can say …Nxe4 fails to dxe4. Before this the
// record kept the best line and the played line only (the engine's top one or
// two), and …Nxe4, 25th in the engine's order, was never read.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { weighedReads, needsWeighedReads, topUpWeighedReads, WEIGH_READS_REV } from './gameAnalysisService';
import { temptingRefuted, type WeighRead } from './weighedMoves';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import type { MoveAnnotation } from '../types';

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

  it('a read with no engine is not remembered: the next read with one reads the position', async () => {
    // The session cache kept the null from a grade that could not lease a
    // worker, so every later grade or top-up of the position read nothing.
    expect(await weighedReads(G.fenBefore, 'Be6', async () => null, 1000)).toBeNull();
    const board = new Chess(G.fenBefore);
    const legal = board.moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
    const byUci = new Map(G.reads.map((r) => [r.moves[0], r]));
    const worst = Math.min(...G.reads.map((r) => r.evaluation));
    const worker = {
      dead: false,
      analyzeFan: async (_fen: string, _lines: number, depth: number, _budget: number, searchmoves: readonly string[] | null) =>
        (searchmoves ?? legal).map((u, i) => {
          const r = byUci.get(u);
          return { rank: i + 1, evaluation: r ? r.evaluation : worst, mate: r ? r.mate : null, bound: null, moves: r ? [...r.moves] : [u], depth };
        }),
    };
    const stored = await weighedReads(G.fenBefore, 'Be6', async () => worker as never, 1000);
    expect(stored?.reads.map((r) => r.moves[0])).toContain('c8e6');
  });
});

// A GAME GRADED BEFORE THE CANDIDATE READS EXISTED (R1, 2026-11-08). The reads
// were taken only by the review's full grade from 2026-11-05 on, and a game
// already graded at review depth opens whole without a re-read — measured on
// David's record: 0 of 966 games carry them, 167 open whole. Such a game is
// topped up once, on the review's open, and stamped.
describe('topUpWeighedReads (a game graded before the reads existed)', () => {
  const LINE = ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Be3', 'Bxe3', 'fxe3', 'Ng4'];
  const fakeWorker = () => {
    const board = new Chess(G.fenBefore);
    const legal = board.moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
    const byUci = new Map(G.reads.map((r) => [r.moves[0], r]));
    const worst = Math.min(...G.reads.map((r) => r.evaluation));
    let calls = 0;
    const w = {
      dead: false,
      analyzeFan: async (fen: string, _lines: number, depth: number, _budget: number, searchmoves: readonly string[] | null) => {
        calls += 1;
        // Only the fixture's board has reads; every other board has one move.
        if (fen.split(' ').slice(0, 4).join(' ') !== G.fenBefore.split(' ').slice(0, 4).join(' ')) return [];
        const ucis = searchmoves ?? legal;
        return ucis.map((u, i) => {
          const r = byUci.get(u);
          return { rank: i + 1, evaluation: r ? r.evaluation : worst, mate: r ? r.mate : null, bound: null, moves: r ? [...r.moves] : [u], depth };
        });
      },
    };
    return { get: async () => w as never, calls: () => calls };
  };
  const gradedGame = (over: Partial<Parameters<typeof buildGameRecord>[0]> = {}) => {
    const board = new Chess();
    const annotations: MoveAnnotation[] = LINE.map((san, i) => {
      board.move(san);
      return { moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san, evaluation: 30, bestMove: null, bestMoveEval: 30, classification: i < 6 ? 'book' : 'good', comment: null };
    });
    return buildGameRecord({ id: 'weigh-topup', pgn: board.pgn(), annotations, fullyAnalyzed: true, analysisDepth: 16, ...over });
  };

  beforeEach(async () => { await db.delete(); await db.open(); });

  it('reads the candidates of every move past the book, stores them and stamps the game', async () => {
    const game = gradedGame();
    await db.games.put(game);
    expect(needsWeighedReads(game)).toBe(true);
    const worker = fakeWorker();
    const out = await topUpWeighedReads(game.id, { worker: worker.get });
    expect(out?.[13].weighed?.reads.map((r) => r.moves[0])).toEqual(expect.arrayContaining(['f6g4', 'f6e4']));
    const stored = await db.games.get(game.id);
    expect(stored?.annotations?.[13].weighed?.depth).toBe(16);
    expect(stored?.weighedRev).toBe(WEIGH_READS_REV);
    // The grade itself is not touched.
    expect(stored?.annotations?.map((a) => a.classification)).toEqual(game.annotations!.map((a) => a.classification));
    // …and Review's computer says the refutation off what was stored.
    expect(temptingRefuted({ fenBefore: G.fenBefore, san: 'Ng4', student: 'b', rating: 1500, reads: stored!.annotations![13].weighed!.reads, priorMove: null })?.text)
      .toBe('Nxe4 is tempting here, but it fails: they play dxe4 — they win a knight for a pawn.');
    // Once stamped, never read again.
    expect(needsWeighedReads(stored!)).toBe(false);
    expect(await topUpWeighedReads(game.id, { worker: worker.get })).toBeNull();
  });

  it('a game the reader left is kept unstamped, so the next open goes on from there', async () => {
    const game = gradedGame();
    await db.games.put(game);
    expect(await topUpWeighedReads(game.id, { worker: fakeWorker().get, stop: () => true })).toBeNull();
    const stored = await db.games.get(game.id);
    expect(stored?.weighedRev).toBeUndefined();
    expect(needsWeighedReads(stored!)).toBe(true);
  });

  it('only a game graded at review depth is topped up — a shallower one is re-read in full on open', () => {
    expect(needsWeighedReads(gradedGame({ analysisDepth: 12 }))).toBe(false);
    expect(needsWeighedReads(gradedGame({ isMasterGame: true }))).toBe(false);
    expect(needsWeighedReads(gradedGame({ weighedRev: WEIGH_READS_REV }))).toBe(false);
  });
});
