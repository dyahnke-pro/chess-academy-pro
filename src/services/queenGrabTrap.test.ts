// Check the queen's exits before you grab (teach-brief §3). Real boards from the
// Lichess puzzle set (CC0), where the opponent's queen grab was the mistake.
import { describe, it, expect } from 'vitest';
import { findQueenGrabTraps, queenGrabTrapLine } from './queenGrabTrap';

describe('queenGrabTrap — a free-looking grab that walls the queen in', () => {
  it('Qxb7 is met by Nc5 and the queen has no safe square', () => {
    const [t] = findQueenGrabTraps('r2q1r1k/pppnn1p1/3p3p/1P1Qp3/8/P1N2N1P/5PP1/R1B1R1K1 w - - 1 17');
    expect(t).toMatchObject({ san: 'Qxb7', replySan: 'Nc5', captured: 'p' });
    expect(queenGrabTrapLine(t)).toBe('Their pawn on b7 looks free, but after Qxb7 they answer Nc5 and your queen has no safe square. Before the queen grabs, count its way back out.');
  });
  it('Qxb2 is met by Bd4', () => {
    expect(findQueenGrabTraps('r1b2rk1/4bppp/p2ppq2/1p6/4PP2/P2BB2P/1PPQN1P1/R6K b - - 5 19').map((t) => t.replySan)).toEqual(['Bd4']);
  });
  it('no grab, no warning', () => {
    expect(findQueenGrabTraps('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toEqual([]);
  });
});
