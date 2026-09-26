// The loss is said once (re-walk 1380, 24.Bg5): the live fundamental verdict
// already says "the bishop on g5 hangs"; the look's own opening sentence says it
// again. The look hands over its line WITHOUT that sentence, and the square it
// was about, so the caller can drop only the repeat and keep the better move.
import { describe, it, expect } from 'vitest';
import { backwardLook } from './backwardLook';

const BEFORE = '3q1r1k/pp4pp/2p1B3/4Pp1P/1b6/2N1BR1P/PPP5/4Q1K1 w - - 1 24';
const AFTER = '3q1r1k/pp4pp/2p1B3/4PpBP/1b6/2N2R1P/PPP5/4Q1K1 b - - 2 24';

describe('backwardLook — the line without its opening loss', () => {
  it('24.Bg5 (hangs to …Qxg5+): the rest keeps the better move, drops the loss', () => {
    const look = backwardLook({
      fenBefore: BEFORE, fenAfter: AFTER, playedSan: 'Bg5', bestSan: 'Bxf5',
      bestPvUci: ['e6f5', 'f8f5', 'f3f5'], replyPvUci: ['d8g5'], replySan: null,
      cpLoss: 285, moverEvalAfterCp: 281, studentColor: 'white',
    } as never);
    expect(look, 'the look speaks on a 2.8-pawn slip').not.toBeNull();
    expect(look?.withoutAttempt, `no attempt sentence: ${look?.line}`).toBeDefined();
    if (!look?.withoutAttempt) return;
    expect(look.withoutAttempt.square).toBe('g5');
    expect(look.line).toMatch(/g5/);
    expect(look.withoutAttempt.line).not.toMatch(/hanging/);
    expect(look.withoutAttempt.line).toMatch(/Bxf5/);
  });
});
