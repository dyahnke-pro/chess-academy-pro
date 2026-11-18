// A CAPTURE TAKEN BACK IS A TRADE, NOT A PIECE LEFT LOOSE (David 2026-11-18,
// the alert check on the 800 Colle replay: 18.Bxg6 took a knight and was told
// "that move leaves a piece of yours loose" — …Nxg6 is the trade back. The
// trade test ran only when the move had no engine price, so a move that was
// costly for another reason — it missed Rxe5 — called its own trade a loose
// piece). The board and engine read are the replay's own.
import { describe, it, expect } from 'vitest';
import { leftLoose } from './focusChances';

describe('leftLoose — net material, priced or not', () => {
  it('18.Bxg6 (a knight taken, the bishop taken back) is no loose piece', () => {
    const fenBefore = 'r1b1r1k1/5ppp/pq2p1n1/1p1pn1BN/3p4/2PB2Q1/PP3PPP/R3R1K1 w - - 1 18';
    const fenAfter = 'r1b1r1k1/5ppp/pq2p1B1/1p1pn1BN/3p4/2P3Q1/PP3PPP/R3R1K1 b - - 0 18';
    expect(leftLoose({
      fenBefore, san: 'Bxg6', fenAfter, student: 'w', cpLoss: 434,
      lines: [{ moves: ['e1e5', 'c8b7', 'e5e1', 'd4c3'], evaluation: 360, mate: null }],
    })).toBeNull();
  });
  it('a quiet move that hangs a piece is still loose (14.Ng5, the bishop on e7 takes it)', () => {
    const fenBefore = 'r1bqrnk1/4bppp/p1n1p3/1p1pP2N/3p4/2PB1N2/PP3PPP/R1BQR1K1 w - - 0 14';
    const fenAfter = 'r1bqrnk1/4bppp/p1n1p3/1p1pP1NN/3p4/2PB4/PP3PPP/R1BQR1K1 b - - 1 14';
    expect(leftLoose({
      fenBefore, san: 'Ng5', fenAfter, student: 'w', cpLoss: 287,
      lines: [{ moves: ['c3d4', 'c8d7'], evaluation: 170, mate: null }],
    })?.piece?.square).toBe('g5');
  });
});
