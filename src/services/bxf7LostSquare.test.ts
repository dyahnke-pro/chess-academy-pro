// 8.Bxf7+ (David's Smith-Morra): the poisoned-pawn fundamental ("That pawn was
// defended: your bishop takes on f7 and is taken on the spot") and the grade
// ("That took the pawn on f7, but the king on e8 takes back — you lose a bishop
// for a pawn") said one loss twice. `mistakeTurnLine` keeps one when they name
// the same square — but the grade reported no lost square for a capture taken
// straight back, so the two never matched.
import { describe, it, expect } from 'vitest';
import { errorWhy } from './inaccuracyCall';
import { sameLossAsGrade } from './mistakeTurnLine';

const BEFORE_BXF7 = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8';
const ew = () => errorWhy({
  fenBefore: BEFORE_BXF7, playedSan: 'Bxf7+', moverColor: 'white', bestSan: 'Ng5',
  bestLineUci: ['f3g5', 'c6e5', 'd1b3', 'e5c4', 'b3c4'],
  replyLineUci: ['e8f7', 'c1d2', 'f7e8', 'd1b3', 'g8f6'],
  missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null, namesBetterMove: false,
} as never);

describe('a capture taken straight back loses the piece on its square', () => {
  it('Bxf7+ Kxf7: the grade’s lost square is f7', () => {
    expect(ew().lostSquare).toBe('f7');
  });
  it('so the f7 fundamental and the grade are one loss', () => {
    expect(sameLossAsGrade({ square: 'f7' }, ew().lostSquare ?? null)).toBe(true);
  });
});
