import { describe, expect, it } from 'vitest';
import { agreedVerdict, settleReads, type ReadFn, type SettledRead } from './settleReads';
import type { NativeLine } from './nativeStockfish';

// The Vienna Copycat board, Black to move after 4.Qg4: the depth-16 reads the
// sheet got (White's point of view, cp).
const FEN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P1Q1/2N5/PPPP1PPP/R1B1K1NR b KQkq - 5 4';
const line = (cp: number, ...pv: string[]): NativeLine => ({ cp, mate: null, pv });
const TOP3 = [line(14, 'd8f6', 'g4g3'), line(18, 'e8f8', 'g4f3'), line(41, 'g7g6', 'g4f3')];
const ALONE: Record<string, NativeLine> = {
  d8f6: line(155, 'd8f6', 'c3d5', 'f6f2'),
  e8f8: line(30, 'e8f8', 'g4f3'),
  g7g6: line(45, 'g7g6', 'g4f3'),
};
const read: ReadFn = async (_fen, opts) => (opts.searchmoves ? [ALONE[opts.searchmoves]] : TOP3);

describe('settleReads — one verdict per move', () => {
  it('re-reads every candidate on its own when the two reads disagree, so the first choice and the cost agree', async () => {
    const r = await settleReads(read, FEN, 'd8f6');
    expect(r.reread).toBe(true);
    // The old sheet ranked …Qf6 first and said it cost 1.41 at once.
    expect(r.top[0].pv[0]).toBe('e8f8');
    expect(r.top.map((l) => l.pv[0])).toEqual(['e8f8', 'g7g6', 'd8f6']);
    expect(r.cost).toBeCloseTo(1.25, 2);
  });

  it('keeps the top-3 read when it agrees with the move read on its own', async () => {
    const agree: ReadFn = async (_fen, opts) => (opts.searchmoves ? [line(20, 'e8f8')] : TOP3);
    const r = await settleReads(agree, FEN, 'e8f8');
    expect(r.reread).toBe(false);
    expect(r.top).toBe(TOP3);
    expect(r.cost).toBeCloseTo(0.06, 2);
  });

  it('re-reads a gap at the writing bar too: first in the list, yet 0.20 worse on its own', async () => {
    const small: ReadFn = async (_fen, opts) => (opts.searchmoves === 'd8f6' ? [line(34, 'd8f6')] : opts.searchmoves ? [ALONE[opts.searchmoves]] : TOP3);
    const r = await settleReads(small, FEN, 'd8f6');
    expect(r.reread).toBe(true);
    expect(r.top[0].pv[0]).toBe('e8f8');
    expect(r.cost).toBeCloseTo(0.04, 2);
  });

  it('never prints a negative cost: a move that reads better than the best is re-read with the rest', async () => {
    const better: ReadFn = async (_fen, opts) => (opts.searchmoves === 'a7a6' ? [line(-60, 'a7a6')] : opts.searchmoves ? [ALONE[opts.searchmoves]] : TOP3);
    const r = await settleReads(better, FEN, 'a7a6');
    expect(r.reread).toBe(true);
    expect(r.top[0].pv[0]).toBe('a7a6');
    expect(r.cost).toBe(0);
  });
});

// White to move; the line plays d5. First read: e3 is 0.85 better. The boards
// one move deeper decide whether a beat may say so.
describe('agreedVerdict — a better move is named only when two reads agree', () => {
  const W = 'rnbqk2r/pp1p1pp1/4pn1p/2p5/1bPP3B/2N5/PP2PPPP/R2QKBNR w KQkq - 0 6';
  const settled: SettledRead = { top: [line(14, 'e2e3'), line(-71, 'd4d5'), line(-57, 'a1c1')], played: line(-71, 'd4d5'), cost: 0.85, reread: true };
  const childOf = (uci: string): { fen: string; mate: boolean; stale: boolean } => ({ fen: `child-${uci} b - - 0 6`, mate: false, stale: false });
  const deeper = (vals: Record<string, number>): ReadFn => async (fen) => [line(vals[fen.split(' ')[0].replace('child-', '')] ?? 0, 'x')];

  it('names the better move when it is ahead now and one move deeper', async () => {
    const v = await agreedVerdict(deeper({ d4d5: -40, e2e3: 20, a1c1: -45 }), W, 'd4d5', settled, childOf);
    expect(v).toEqual({ kind: 'prefers', uci: 'e2e3', now: 85, deeper: 60 });
  });

  it('names none when the deeper boards do not agree (the Leningrad d5: 0.85 now, 0.10 one move deeper)', async () => {
    const v = await agreedVerdict(deeper({ d4d5: 10, e2e3: 20, a1c1: -45 }), W, 'd4d5', settled, childOf);
    expect(v.kind).toBe('unsettled');
    expect(v).toMatchObject({ uci: 'e2e3', now: 85, deeper: 10 });
  });

  it('reads no deeper board when the first read puts no move ahead by the bar', async () => {
    let reads = 0;
    const counting: ReadFn = async () => { reads += 1; return [line(0, 'x')]; };
    const close: SettledRead = { top: [line(14, 'e2e3'), line(0, 'd4d5')], played: line(0, 'd4d5'), cost: 0.14, reread: false };
    expect(await agreedVerdict(counting, W, 'd4d5', close, childOf)).toEqual({ kind: 'level' });
    const first: SettledRead = { top: [line(14, 'e2e3'), line(0, 'd4d5')], played: line(14, 'e2e3'), cost: 0, reread: false };
    expect(await agreedVerdict(counting, W, 'e2e3', first, childOf)).toEqual({ kind: 'first' });
    expect(reads).toBe(0);
  });

  it('counts a move that mates as better without a read', async () => {
    const mates = (uci: string): { fen: string; mate: boolean; stale: boolean } => ({ fen: `child-${uci} b - - 0 6`, mate: uci === 'e2e3', stale: false });
    const v = await agreedVerdict(deeper({ d4d5: -40 }), W, 'd4d5', settled, mates);
    expect(v.kind).toBe('prefers');
  });
});
