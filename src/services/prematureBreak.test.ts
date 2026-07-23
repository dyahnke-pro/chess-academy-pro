import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { prematureBreakWhy } from './reviewFullData';

const at = (moves: string): string => {
  const c = new Chess();
  moves.split(' ').forEach((m) => c.move(m));
  return c.fen();
};

describe('prematureBreakWhy — the grounded "why it\'s a mistake" (David 2026-07-23)', () => {
  it('fires on a central pawn break while behind in development', () => {
    // Danya\'s fABTn305: White plays 13.e5 with 1 developed minor vs Black\'s 2.
    const fen = at('e4 c5 Nc3 g6 f4 Bg7 Nf3 Nc6 Bb5 Nd4 O-O Nxb5 Nxb5 d6 d3 Nf6 Qe1 Bg4 Qh4 Qd7 Nc3 Bxf3 Rxf3 O-O-O');
    const why = prematureBreakWhy(fen, 'e5');
    expect(why).toBeTruthy();
    expect(why).toMatch(/central break/);
    expect(why).toMatch(/behind in development|king still uncastled/);
    expect(why).toMatch(/premature/);
  });

  it('does NOT fire on a central push when development is even (no overstatement)', () => {
    expect(prematureBreakWhy(at('e4 e5 Nf3 Nc6'), 'd4')).toBeNull();
  });

  it('does NOT fire on a non-central move', () => {
    const fen = at('e4 c5 Nc3 g6 f4 Bg7 Nf3 Nc6 Bb5 Nd4 O-O Nxb5 Nxb5 d6 d3 Nf6 Qe1 Bg4 Qh4 Qd7 Nc3 Bxf3 Rxf3 O-O-O');
    expect(prematureBreakWhy(fen, 'a3')).toBeNull();
  });

  it('does NOT fire on a knight move (only pawn breaks qualify)', () => {
    expect(prematureBreakWhy(at('e4 e5 Nf3 Nc6 Bc4 Bc5'), 'Ng5')).toBeNull();
  });
});
