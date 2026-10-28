import { describe, it, expect } from 'vitest';
import { errorWhy, NO_SECOND_READ } from './inaccuracyCall';

// Walk 2026-10-11 (prod Learn): "That left your knight on f6 hanging to gxf6"
// and "Bc5 was imprecise — it let them play gxf6, which wins the knight on f6"
// were BOTH said. The grade's reader never reported the square it wins on, so
// the surface could not tell they were one loss.
describe('every reader reports the square their reply wins on', () => {
  it('Bc5 lets gxf6: lostSquare is f6', () => {
    const ew = errorWhy({
      secondReads: NO_SECOND_READ,
      fenBefore: 'rnbqkb1r/pppp1ppp/5n2/4p1P1/8/8/PPPPPP1P/RNBQKBNR b KQkq - 0 3', playedSan: 'Bc5', moverColor: 'black',
      bestSan: null, bestLineUci: null, replyLineUci: ['g5f6'], missedMate: null, allowedMate: null, bestMate: null,
      quality: 'mistake', priorMove: null, replySan: null, namesBetterMove: false,
    });
    expect(ew.consequence ?? ew.failed ?? '').toMatch(/f6/);
    expect(ew.lostSquare).toBe('f6');
  });
});
