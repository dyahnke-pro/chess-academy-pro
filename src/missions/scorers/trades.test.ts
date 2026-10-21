import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { hasActiveWeights, scoreCandidates, type ScoringContext } from '../moveScoring';
import { captureNet, tradesScorer } from './trades';

/** Ruy Lopez, 4th move, White (the coach) to move: Bxc6 is bishop for knight;
 *  Nxe5 and Bxa6 give a piece for a pawn. */
const RUY = 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
/** Queens facing on the d-file, both defended by their kings: Qxd8+ Kxd8 is queen for queen. */
const QUEENS = '3qk3/8/8/8/8/8/8/3QK3 w - - 0 1';
/** A rook left loose on d5: Qxd5 wins it outright. */
const LOOSE = '4k3/8/8/3r4/8/8/8/3QK3 w - - 0 1';

const ctx = (fen: string, coachEvalCp: number | null): ScoringContext => ({
  fen, coach: 'w', windowCp: 300, coachEvalCp, pattern: null, phase: 'middlegame', bossId: null, targets: [],
});
const score = (fen: string, uci: string, evalCp: number | null): number => tradesScorer({ uci, cpLoss: 0 }, ctx(fen, evalCp));

describe('the trades scorer', () => {
  it('registers itself under the `trades` dial', () => {
    expect(hasActiveWeights({ trades: 1 })).toBe(true);
  });

  it('nets each capture by the legal SEE', () => {
    expect(captureNet(RUY, 'b5c6')).toBe(0);
    expect(captureNet(RUY, 'f3e5')).toBe(-2);
    expect(captureNet(RUY, 'b5a6')).toBe(-2);
    expect(captureNet(QUEENS, 'd1d8')).toBe(0);
    expect(captureNet(LOOSE, 'd1d5')).toBe(5);
    expect(captureNet(RUY, 'e1g1')).toBeNull();
    expect(captureNet(RUY, 'a1a8')).toBeNull();
  });

  it('+1 for an equal trade only while the coach is behind', () => {
    expect(score(RUY, 'b5c6', -120)).toBe(1);
    expect(score(QUEENS, 'd1d8', -400)).toBe(1);
    expect(score(RUY, 'b5c6', 0)).toBe(0);
    expect(score(RUY, 'b5c6', 150)).toBe(0);
    expect(score(RUY, 'b5c6', null)).toBe(0);
  });

  it('a quiet move or a capture that wins material is not a trade', () => {
    expect(score(RUY, 'e1g1', -120)).toBe(0);
    expect(score(LOOSE, 'd1d5', -120)).toBe(0);
  });

  it('never likes a losing trade — at any standing, every capture on these boards', () => {
    for (const fen of [RUY, QUEENS, LOOSE]) {
      const caps = new Chess(fen).moves({ verbose: true }).filter((m) => m.captured);
      for (const m of caps) {
        const uci = `${m.from}${m.to}${m.promotion ?? ''}`;
        if ((captureNet(fen, uci) ?? 0) >= 0) continue;
        for (const evalCp of [-500, -1, 0, 300, null]) expect(score(fen, uci, evalCp)).toBe(0);
      }
    }
  });

  it('under either weight a losing trade is never lifted above a quiet move', () => {
    const cands = [{ uci: 'e1g1', cpLoss: 0 }, { uci: 'f3e5', cpLoss: 40 }, { uci: 'b5c6', cpLoss: 10 }];
    // Eager: the equal trade leads; the losing one stays behind the quiet move.
    expect(scoreCandidates(cands, ctx(RUY, -150), { trades: 1 }).map((c) => c.uci)).toEqual(['b5c6', 'e1g1', 'f3e5']);
    // Reluctant: the equal trade drops last; the losing one is NOT promoted.
    expect(scoreCandidates(cands, ctx(RUY, -150), { trades: -1 }).map((c) => c.uci)).toEqual(['e1g1', 'f3e5', 'b5c6']);
  });

  it('not the coach to move → no opinion', () => {
    expect(tradesScorer({ uci: 'b5c6', cpLoss: 0 }, { ...ctx(RUY, -150), coach: 'b' })).toBe(0);
  });
});
