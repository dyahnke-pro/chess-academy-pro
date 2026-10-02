/** EVERY STATED MOVE GETS AN ARROW (David 2026-10-02: "Make sure all stated
 *  moves have arrows"). Each case fails on the resolver it replaced. */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { namedMoveArrows } from './learnBoardTeaching';
import { admitArrows } from './arrowDoor';
import { segmentNamedArrows } from './coachFeatureService';

const START = new Chess().fen();
const after = (...sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const pairs = (cs: ReadonlyArray<{ from: string; to: string }>): string[] => cs.map((c) => `${c.from}${c.to}`);

describe('namedMoveArrows', () => {
  it('a LINE is drawn ply by ply, not just its first move', () => {
    const c = namedMoveArrows('That line runs e4 e5 Nf3 Nc6.', START, 'w');
    expect(pairs(c)).toEqual(['e2e4', 'e7e5', 'g1f3', 'b8c6']);
    expect(c.every((x) => x.role === 'line')).toBe(true);
    // Every ply passes the door on its own board.
    expect(admitArrows(c, { fen: START, studentColor: 'white' }).arrows).toHaveLength(4);
  });

  it('a square is never read as a pawn move (them / guard / of / then / watch)', () => {
    for (const t of ['That costs them d3.', 'Guard e5 before the push.', 'by way of b4 and d5', 'via c4, then d3', 'Watch c7 — a knight lands there.']) {
      expect(pairs(namedMoveArrows(t, START, 'w')), t).toEqual([]);
    }
  });

  it('the move just played is already lit — no second arrow', () => {
    expect(namedMoveArrows('Nf3 develops toward the center.', after('Nf3'), 'w', START)).toEqual([]);
  });

  it('a better move only legal on the board before is drawn as the move missed there', () => {
    // 3.d3 shut the f1 bishop's road to b5; on the board before, Bb5 was there.
    const before = after('e4', 'e5', 'Nf3', 'Nc6');
    const now = after('e4', 'e5', 'Nf3', 'Nc6', 'd3');
    const c = namedMoveArrows('Bb5 was the better move.', now, 'w', before);
    expect(c).toEqual([expect.objectContaining({ from: 'f1', to: 'b5', role: 'missed', fen: before })]);
    expect(admitArrows(c, { fen: now, studentColor: 'white' }).arrows).toHaveLength(1);
  });

  it('the coach\'s own named move is engine-vouched, so the door does not refuse it as unsafe', () => {
    const c = namedMoveArrows('It can wait — Nc3 comes first.', START, 'w');
    expect(c).toEqual([expect.objectContaining({ from: 'b1', to: 'c3', role: 'play', vouchedBy: 'engine' })]);
  });

  it('a move called a mistake, or one a move takes away, is said and never arrowed', () => {
    expect(namedMoveArrows('e4 was a mistake here.', START, 'w')).toEqual([]);
    expect(namedMoveArrows('That takes Nc3 away.', START, 'w')).toEqual([]);
  });
});

describe('Review beats arrow their named moves too', () => {
  it('a beat naming a better move gets its arrow on the board after the move', () => {
    const arrows = segmentNamedArrows({ narration: 'Bb5 was the better move.', fenBefore: after('e4', 'e5', 'Nf3', 'Nc6'), fenAfter: after('e4', 'e5', 'Nf3', 'Nc6', 'd3') }, 'white');
    expect(arrows.map((a) => `${a.startSquare}${a.endSquare}`)).toEqual(['f1b5']);
  });
  it('a beat with no narration draws nothing', () => {
    expect(segmentNamedArrows({ narration: null, fenBefore: START, fenAfter: START }, 'white')).toEqual([]);
  });
});
