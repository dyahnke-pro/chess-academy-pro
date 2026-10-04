// Clean-pass walk 2026-10-03, G1 (lichess SI5q0VJz) 18.Ba2: the coach said
// "Ba4+ was the move — the idea is to walk the bishop round to c5, by way of
// e3". Ba4+ moves the b3 bishop; the e3-c5 route in the engine's line is the
// f4 bishop's. A route belongs to the move only when it starts on the square
// the move leaves — read off the clause's data, not its wording.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { betterMoveReason } from './inaccuracyCall';

const FEN = 'r3k1nr/5ppp/1q2p3/n2pPb2/5B2/PB3N2/1P3PPP/R2Q1RK1 w kq - 1 18';
// Stockfish 18, depth 16: Ba4+ Kf8 Be3 Qxb2 Bc5+ Ne7 Nd4 g6.
const uci = (() => {
  const c = new Chess(FEN);
  return ['Ba4+', 'Kf8', 'Be3', 'Qxb2', 'Bc5+', 'Ne7', 'Nd4', 'g6'].map((s) => { const m = c.move(s); return `${m.from}${m.to}`; });
})();

describe('a route is the move\'s own only from its own square', () => {
  it('Ba4+ is not given the f4 bishop\'s route', () => {
    const r = betterMoveReason(FEN, 'Ba2', 'Ba4+', uci, 'white', null, false) ?? '';
    expect(r).not.toMatch(/walk the bishop round to c5/);
    expect(r).not.toMatch(/walk the bishop on f4/);
  });
});
