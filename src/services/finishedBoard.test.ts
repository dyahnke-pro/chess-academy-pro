import { describe, it, expect } from 'vitest';
import { finishedBoardEval } from './finishedBoard';
import { MATE_EVAL_VALUE, isMateEval } from './engineConstants';
import { readFileSync } from 'node:fs';

// After Qd8#: Black to move, mated — White won.
const BLACK_MATED = '3Q2k1/5ppp/8/1n6/8/P7/R7/6K1 b - - 1 1';
// Back-rank mate on White.
const WHITE_MATED = '6k1/8/8/8/8/8/5PPP/r5K1 w - - 0 1';
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';

describe('a finished board is read off the board (David 2026-10-14: "the eval does even at the end")', () => {
  it('mate is the winner\'s full mate score, White POV', () => {
    expect(finishedBoardEval(BLACK_MATED)).toBe(MATE_EVAL_VALUE);
    expect(finishedBoardEval(WHITE_MATED)).toBe(-MATE_EVAL_VALUE);
    expect(isMateEval(finishedBoardEval(BLACK_MATED))).toBe(true);
  });
  it('stalemate is level; a live game is not finished', () => {
    expect(finishedBoardEval(STALEMATE)).toBe(0);
    expect(finishedBoardEval('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBeNull();
    // Bare kings have moves: the engine searches them (its own tests do).
    expect(finishedBoardEval('8/8/8/4k3/8/8/8/4K3 w - - 0 1')).toBeNull();
  });
  it('every engine door asks the board first — the singleton and the review pool', () => {
    const engine = readFileSync('src/services/stockfishEngine.ts', 'utf8');
    expect(engine.match(/const finished = finishedAnalysis\(fen, depth\);/g)?.length).toBe(2);
    const pool = readFileSync('src/services/gameAnalysisService.ts', 'utf8');
    expect(pool).toMatch(/const done = finishedBoardEval\(fen\);/);
    expect(pool).toMatch(/if \(finishedBoardEval\(fen\) !== null\) return Promise\.resolve\(\[\]\);/);
  });
});
