// initiativeRead — who is making the threats, read off the engine's own best
// line (WO-DANYA-READS-01 #2). The boards and lines are Danya's Chess.com
// article diagrams (reference only, never quoted) with Stockfish's depth-16
// line from each.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { forcingMoves, initiativeRead, initiativeLine } from './initiativeRead';

const moves = (s: string): string[] => s.split(' ');

describe('initiativeRead', () => {
  it("Alekhine's gun: both rook moves to the c-file hit the knight on c6 (alekhines-gun2 #0)", () => {
    const fen = 'r4rk1/p3nqp1/Ppn1p2p/1B1pPp2/1P1P1P2/5N2/3Q2PP/R4RK1 w - - 0 20';
    const i = initiativeRead(fen, [{ moves: moves('a1c1 f8c8 c1c2 a8b8 f1c1 f7e8 c2c3 c8c7') }])!;
    expect(i.side).toBe('w');
    expect(i.forcing.map((f) => f.san)).toEqual(['Rac1', 'Rfc1']);
    expect(i.forcing.every((f) => f.target.square === 'c6')).toBe(true);
    // Board truth: after Rac1 the knight on c6 is hit by the rook and the bishop on b5.
    const c = new Chess(fen); c.move('Rac1');
    expect(c.attackers('c6', 'w').sort()).toEqual(['b5', 'c1']);
    expect(initiativeLine(i, 'w', 0)).toBe('You have the initiative: your moves keep hitting their knight on c6, and they have to answer each one.');
  });

  it('the Greek gift: two checks in a row, said from the defender\'s seat too (the-greek-gift-sacrifice-lives-on #3, level)', () => {
    const fen = 'r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16';
    const i = initiativeRead(fen, [{ moves: moves('d3h7 g8h7 f3g5 h7g6 b2b4 c5d7 e2e4 f7f5') }])!;
    expect(i.side).toBe('w');
    expect(i.forcing.map((f) => `${f.san}:${f.kind}`)).toEqual(['Bxh7+:check', 'Ng5+:check']);
    expect(initiativeLine(i, 'b', 0)).toBe('They have the initiative: their moves keep hitting your king, and you have to answer each one.');
  });

  it('negative controls: a quiet opening line, an even trade, no line', () => {
    const start = new Chess().fen();
    expect(initiativeRead(start, [{ moves: moves('e2e4 e7e5 g1f3 b8c6 f1c4 f8c5') }])).toBeNull();
    // 1.e4 d5 2.exd5 Qxd5: captures that do not check are the trade, not a threat.
    expect(forcingMoves(start, moves('e2e4 d7d5 e4d5 d8d5'))).toEqual([]);
    expect(initiativeRead(start, [])).toBeNull();
  });
});
