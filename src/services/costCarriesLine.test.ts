// A COST WITH NOTHING ELSE TO SAY CARRIES ITS LINE (A-plan P6, prod Learn
// 2026-10-16: "Bishop to e7 was a mistake — it cost more than a point of
// advantage", with nothing on the board to check).
import { describe, it, expect } from 'vitest';
import { errorWhy, errorGradeSentence } from './inaccuracyCall';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ewOf = () => errorWhy({ fenBefore: START, playedSan: 'f3', moverColor: 'white', bestSan: null, bestLineUci: null, replyLineUci: ['e7e5', 'e2e4', 'd8h4'], missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null, namesBetterMove: false } as never);

describe('a cost-only verdict carries the engine\'s answer as its line', () => {
  it('f3: the cost, then the line, and the line to walk on the board', () => {
    const ew = ewOf();
    expect(errorGradeSentence(ew, 'mistake', 150)).toBe('a mistake — it cost more than a point of advantage. The line: e5, e4 and Qh4+.');
    expect(ew.costLine?.uci).toEqual(['e7e5', 'e2e4', 'd8h4']);
  });
  it('never on the generic tail or line, which the opponent\'s slip reads (it would hand over the student\'s find)', () => {
    const ew = ewOf();
    expect(ew.tail).toBe('');
    expect(ew.line).toBeUndefined();
  });
  it('a grade whose cost is not said keeps its line quiet too', () => {
    expect(errorGradeSentence(ewOf(), 'mistake', null)).not.toContain('The line');
  });
});
