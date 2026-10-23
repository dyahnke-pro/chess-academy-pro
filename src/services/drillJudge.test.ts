import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { judgeDrillMove, type DrillJudgeReads } from './drillJudge';

// The replay drill's position from the prod record run (2026-10-23): White to
// move, the knight on c1 trapped. The key is Rxc1; depth 14 has Qh5 a
// centipawn from it (-620 vs -621), while two separate quick reads of the
// boards after each move disagreed by two pawns.
const FEN = 'r1bq1rk1/pppp1ppp/3b4/4p3/2B3Q1/8/PPPP1PPP/R1n1K2R w KQ - 2 10';

const AFTER_QH5 = (() => { const c = new Chess(FEN); c.move('Qh5'); return c.fen(); })();
const noisyReads = (wrong: number, key: number): DrillJudgeReads['read'] =>
  async (fen) => (fen === AFTER_QH5 ? { evaluation: wrong, pv: ['g7g6'] } : { evaluation: key, pv: [] });

describe('the drill judges a move off the key by the one price', () => {
  it('a move one search scores level with the key is taken, whatever two quick reads said', async () => {
    const reads: DrillJudgeReads = {
      price: async () => ({ costCp: 0, scores: { bestWhiteCp: -621, playedWhiteCp: -620 }, settled: true }),
      read: noisyReads(-820, -621),
    };
    const j = await judgeDrillMove(FEN, 'Qh5', 'Rxc1', reads);
    expect(j?.verdict).toBe('accept');
  });
  it('twin: a move the one search puts two pawns below the key loses, with the reply line for the refusal', async () => {
    const reads: DrillJudgeReads = {
      price: async () => ({ costCp: 200, scores: { bestWhiteCp: -421, playedWhiteCp: -621 }, settled: true }),
      read: noisyReads(-620, -621),
    };
    const j = await judgeDrillMove(FEN, 'Qh5', 'Rxc1', reads);
    expect(j?.verdict).toBe('loses');
    expect(j?.wrongPv).toEqual(['g7g6']);
  });
  it('no price and no mate on the board: no verdict, never the two reads subtracted', async () => {
    const reads: DrillJudgeReads = { price: async () => null, read: noisyReads(-820, -621) };
    expect(await judgeDrillMove(FEN, 'Qh5', 'Rxc1', reads)).toBeNull();
  });
  it('a mate on the board: the two boards\' mate scores judge it', async () => {
    const reads: DrillJudgeReads = { price: async () => null, read: noisyReads(-100000, -621) };
    expect((await judgeDrillMove(FEN, 'Qh5', 'Rxc1', reads))?.verdict).toBe('loses');
  });
});
