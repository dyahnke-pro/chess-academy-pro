// THE ALERT FIRES WHEN A MOVE WALKS INTO THEIR TACTIC (David 2026-11-18: "the
// tactic alert … NEEDS TO BE RIGHT"; his 31…f5 let Qb7 threaten Qg7# and no
// alert fired — only a piece left loose was ever alerted). Proven off the read
// before the move: the played move's own line, its cost, their reply on it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { walkedInto, judgeChance, type FocusMove } from './focusChances';

const FEN = '2qr2k1/R4p1p/4p1p1/2p5/8/3PKQP1/7P/8 b - - 0 31';
const after = (san: string): string => { const c = new Chess(FEN); c.move(san); return c.fen(); };
// White's view: Rf8 holds (+0.5); f5 lets Qb7 in (+2.9).
const LINES = [
  { moves: ['d8f8', 'e3e2', 'c8c6'], evaluation: 50, mate: null },
  { moves: ['f7f5', 'f3b7', 'c8b7', 'a7b7'], evaluation: 290, mate: null },
];
const move = (san: string): FocusMove => ({ fenBefore: FEN, san, fenAfter: after(san), student: 'b', cpLoss: null, lines: LINES });

describe('walkedInto — their tactic after your move, proven on the read', () => {
  it('31…f5 lets Qb7 threaten mate on g7', () => {
    const ch = walkedInto(move('f5'));
    expect(ch?.kind).toBe('allow');
    expect(ch?.tag).toBe('missed-their-mate');
    expect(ch?.attacker?.square).toBe('b7');
    expect(ch && judgeChance(ch, move('f5'))).toBe('missed');
  });
  it('the move the read prefers walks into nothing', () => {
    expect(walkedInto(move('Rf8'))).toBeNull();
  });
  it('a move the read does not hold is never guessed at', () => {
    expect(walkedInto(move('h5'))).toBeNull();
  });
});
