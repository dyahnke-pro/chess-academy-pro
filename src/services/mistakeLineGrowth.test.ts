import { describe, it, expect } from 'vitest';
import { growOneMove, pliesFor, shrinkOnMiss, solveLengthOf, MAX_SOLVE_LENGTH } from './mistakeLineGrowth';
import type { EvaluateMulti, RawCandidate } from './criticalityScan';

// Scholar's-mate setup: White to move, Qxf7# is the only good move.
const START = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';

/** A scripted engine: per FEN, the candidates it returns. */
function engine(table: Record<string, RawCandidate[]>): EvaluateMulti {
  return async (fen, multiPV) => (table[fen] ?? []).slice(0, multiPV);
}

describe('mistakeLineGrowth', () => {
  it('absent length is one move; the board plays your moves and their replies, ending on yours', () => {
    expect(solveLengthOf({})).toBe(1);
    const m = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(pliesFor(m, 1)).toEqual(['a']);
    expect(pliesFor(m, 2)).toEqual(['a', 'b', 'c']);
    expect(pliesFor(m, 9)).toEqual(m);
  });

  it('a miss drops one move, never below one', () => {
    expect(shrinkOnMiss(3)).toBe(2);
    expect(shrinkOnMiss(1)).toBe(1);
    expect(shrinkOnMiss(undefined)).toBe(1);
  });

  it('does not grow past mate — the payoff landed', async () => {
    const g = await growOneMove(START, ['h5f7'], 1, engine({}));
    expect(g.solveLength).toBe(1);
    expect(g.cappedAt).toBe(1);
  });

  it('grows when YOUR next move is the one good move', async () => {
    // 1.e4 (you) e5 (them) — then Nf3 must be the clear best.
    const fen0 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const afterReply = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const g = await growOneMove(fen0, ['e2e4', 'e7e5'], 1, engine({
      [afterReply]: [{ uci: 'g1f3', cp: 400 }, { uci: 'd2d4', cp: 50 }],
    }));
    expect(g.solveLength).toBe(2);
    expect(g.moves).toEqual(['e2e4', 'e7e5', 'g1f3']);
    expect(g.cappedAt).toBeNull();
  });

  it('stops when two moves both win — it would mark a winning move wrong', async () => {
    const fen0 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const afterReply = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const g = await growOneMove(fen0, ['e2e4', 'e7e5'], 1, engine({
      [afterReply]: [{ uci: 'g1f3', cp: 400 }, { uci: 'd2d4', cp: 380 }],
    }));
    expect(g.solveLength).toBe(1);
    expect(g.cappedAt).toBe(1);
  });

  it('takes the engine reply when the stored line has none', async () => {
    const fen0 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const afterReply = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const g = await growOneMove(fen0, ['e2e4'], 1, engine({
      [afterE4]: [{ uci: 'e7e5', cp: 30 }],
      [afterReply]: [{ uci: 'g1f3', cp: 400 }, { uci: 'b1c3', cp: 100 }],
    }));
    expect(g.moves).toEqual(['e2e4', 'e7e5', 'g1f3']);
  });

  it('has a ceiling', async () => {
    const g = await growOneMove(START, [], MAX_SOLVE_LENGTH, engine({}));
    expect(g.solveLength).toBe(MAX_SOLVE_LENGTH);
  });
});
