import { describe, it, expect } from 'vitest';
import { gradeSpoken, moverQuality } from './backwardLook';

// V6 on David's record (Learn, 2026-10-20): 158 and 181cp moves in a decided
// game held every lane on 'verdict-turn', and no grade spoke — by win% the
// move is no slip, so there was no verdict to wait for.
const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const base = { fenBefore: FEN, playedSan: 'a6', bestSan: 'e5', historySans: ['e4', 'a6'], studentColor: 'black' as const };

describe('gradeSpoken: only a move with a spoken grade holds the turn for it', () => {
  it('a big cost in a decided game is no slip, so no grade speaks', () => {
    const args = { ...base, cpLoss: 170, scores: { bestWhiteCp: -1200, playedWhiteCp: -1030 } };
    expect(['inaccuracy', 'mistake', 'blunder']).not.toContain(moverQuality(args));
    expect(gradeSpoken(args)).toBe(false);
  });
  it('the same cost from a level game is a mistake, and it speaks', () => {
    const args = { ...base, cpLoss: 170, scores: { bestWhiteCp: -20, playedWhiteCp: 150 } };
    expect(moverQuality(args)).toBe('mistake');
    expect(gradeSpoken(args)).toBe(true);
  });
});
