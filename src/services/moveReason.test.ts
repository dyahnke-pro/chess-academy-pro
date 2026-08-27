import { describe, it, expect } from 'vitest';
import {
  classifyMoveReason,
  isFaultReason,
  reasonWeaknessTag,
  gradeWorthSpeaking,
  hangingNetForMover,
  moveReasonClause,
  type MoveReasonInputs,
} from './moveReason';

const base: MoveReasonInputs = {
  label: 'good', isBest: false, cpLossCp: 0, gap12: 0, threatNetBefore: 0,
  hangAfter: 0, forceNetBest: 0, capture: false, seeNow: 0, refuteNet: 0,
};

describe('classifyMoveReason — faithful to the validated offline classifier', () => {
  it('a blunder that leaves a piece en prise → hung-piece', () => {
    expect(classifyMoveReason({ ...base, label: 'blunder', cpLossCp: 300, hangAfter: 3 })).toBe('hung-piece');
  });
  it('a mistake with an unmet standing threat → ignored-threat', () => {
    expect(classifyMoveReason({ ...base, label: 'mistake', cpLossCp: 200, threatNetBefore: 3 })).toBe('ignored-threat');
  });
  it('a blunder whose refutation wins material a few ply in → walked-into-tactic', () => {
    expect(classifyMoveReason({ ...base, label: 'blunder', cpLossCp: 250, refuteNet: 3 })).toBe('walked-into-tactic');
  });
  it('a mistake with no tactic found → lost-the-thread', () => {
    expect(classifyMoveReason({ ...base, label: 'mistake', cpLossCp: 150 })).toBe('lost-the-thread');
  });
  it('an inaccuracy under a standing threat → imprecise-defence, else second-best', () => {
    expect(classifyMoveReason({ ...base, label: 'inaccuracy', cpLossCp: 60, threatNetBefore: 3 })).toBe('imprecise-defence');
    expect(classifyMoveReason({ ...base, label: 'inaccuracy', cpLossCp: 60 })).toBe('second-best');
  });
  it('the best move standing far ahead → only-move', () => {
    expect(classifyMoveReason({ ...base, label: 'best', isBest: true, gap12: 200 })).toBe('only-move');
  });
  it('a good capture winning material → wins-material', () => {
    expect(classifyMoveReason({ ...base, label: 'good', capture: true, seeNow: 3 })).toBe('wins-material');
  });
  it('a forced mate outranks everything', () => {
    expect(classifyMoveReason({ ...base, label: 'blunder', cpLossCp: 100000 })).toBe('mate');
  });
});

describe('the post-move-grade helpers', () => {
  it('faults are drillable + carry a weakness tag; merits do not', () => {
    expect(isFaultReason('hung-piece')).toBe(true);
    expect(reasonWeaknessTag('hung-piece')).toBe('reason:hung-piece');
    expect(isFaultReason('best')).toBe(false);
    expect(reasonWeaknessTag('best')).toBeNull();
  });
  it('a routine solid move is not worth speaking; faults + finds + clean bests are', () => {
    expect(gradeWorthSpeaking('solid')).toBe(false);
    expect(gradeWorthSpeaking('best')).toBe(true);
    expect(gradeWorthSpeaking('hung-piece')).toBe(true);
    expect(gradeWorthSpeaking('only-move')).toBe(true);
  });
  it('names the pattern (not the SAN) and the hung piece when known', () => {
    expect(moveReasonClause('walked-into-tactic', { named: 'a knight fork' })).toMatch(/walked into a knight fork/);
    expect(moveReasonClause('hung-piece', { hung: { piece: 'b', square: 'c5' } })).toMatch(/hung the bishop on c5/);
  });
});

describe('hangingNetForMover — board-true SEE-lite', () => {
  it('sees a bishop left hanging to a rook (a pin-style loss)', () => {
    // White bishop on e5, attacked by the black rook on e8, undefended.
    const net = hangingNetForMover('4r1k1/8/8/4B3/8/8/8/6K1 w - - 0 1', 'w');
    expect(net).toBeGreaterThanOrEqual(3);
  });
  it('is 0 when nothing hangs', () => {
    expect(hangingNetForMover('6k1/8/8/8/8/8/8/6K1 w - - 0 1', 'w')).toBe(0);
  });
});
