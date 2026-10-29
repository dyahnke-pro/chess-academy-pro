// A COST WITH NOTHING ELSE TO SAY CARRIES ITS LINE (A-plan P6, prod Learn
// 2026-10-16: "Bishop to e7 was a mistake — it cost more than a point of
// advantage", with nothing on the board to check).
import { describe, it, expect } from 'vitest';
import { errorWhy, errorGradeSentence } from './inaccuracyCall';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ewOf = (namesBetterMove = false) => errorWhy({ fenBefore: START, playedSan: 'f3', moverColor: 'white', bestSan: null, bestLineUci: null, replyLineUci: ['e7e5', 'e2e4', 'd8h4'], missedMate: null, allowedMate: null, bestMate: null, quality: 'mistake', priorMove: null, namesBetterMove } as never);

describe('a cost-only verdict carries the engine\'s answer as its line', () => {
  it('f3 in Learn: the cost and their answer — the student\'s next move is not named; the board walks the line', () => {
    // David's Keres 22.Rxa5: "They answer bxa5, you play h6" — h6 was his next move.
    // And the answer is the ENGINE's, never said as what they played (prod
    // walk 2026-10-29: "They answer queen takes g4" after they played Rab1).
    const ew = ewOf();
    expect(errorGradeSentence(ew, 'mistake', 150)).toBe('a mistake — it cost more than a point of advantage. The answer to it is e5.');
    expect(ew.costLine?.uci).toEqual(['e7e5', 'e2e4', 'd8h4']);
  });
  it('where the move may be named (review), the whole line is said', () => {
    expect(errorGradeSentence(ewOf(true), 'mistake', 150)).toBe('a mistake — it cost more than a point of advantage. The answer to it is e5, then you play e4, and they play Qh4+.');
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
