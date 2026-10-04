import { describe, expect, it } from 'vitest';
import { callInaccuracy } from './inaccuracyCall';
import { mateContext } from '../utils/mateContext';

// Clean-pass re-walk 2026-10-04, G1 (lichess SI5q0VJz) 31.Qxe4+: "Qxe4+ still
// wins, but Rc7+ was cleaner — it would swing pieces toward their king" — two
// moves after "There's a forced mate here, starting with Rc7+". The reason a
// mating move is better is the mate.
const FEN = '2Rn3r/4k1pp/5q2/3B4/Q3p3/P4N2/5PPP/6K1 w - - 2 31';

describe('a mating best move is better because it mates', () => {
  it('mateContext reports the best move\'s mate', () => {
    expect(mateContext({ isMate: true, mateIn: 6 }, { isMate: false, mateIn: null }, 'white').bestMate).toBe(6);
    expect(mateContext({ isMate: true, mateIn: 6 }, { isMate: false, mateIn: null }, 'white', true).bestMate).toBeNull();
  });
  it('the verdict names the mate, not a king read', () => {
    const call = callInaccuracy({
      fenBefore: FEN, playedSan: 'Qxe4+', bestSan: 'Rc7+',
      bestLineUci: ['c8c7', 'e7f8', 'a4b4', 'f8e8', 'b4e4', 'e8f8', 'f3e5', 'g7g5', 'e5d7', 'f8g7', 'd7f6', 'g7f6'],
      cpLoss: 400, side: 'student', moverColor: 'white', moverEvalAfterCp: 600,
      replyLineUci: [], replySan: null, priorMove: null, missedMate: 6, bestMate: 6,
    });
    expect(call?.said ?? '').toMatch(/forced mate/);
    expect(call?.said ?? '').not.toMatch(/swing pieces/);
  });
});
