import { describe, it, expect } from 'vitest';
import { boardKind } from './positionCharacter';

describe('the kind of position on one board', () => {
  it('opposite-coloured bishops with only pawns: better, but drawing chances', () => {
    // White bishop on light d3, black bishop on dark c5; White a pawn up.
    const fen = '6k1/5ppp/8/2b5/8/3B4/5PPP/6K1 w - - 0 1';
    expect(boardKind(fen, 'w', 120)?.kind).toBe('drawing-chances');
    expect(boardKind(fen, 'w', 600)).toBeNull(); // decided: no drawing chances said
  });

  it('locked, and only when the game is close (Desperado: clearly worse in a bind is not "nobody in danger")', () => {
    const desperado = 'rnq2rk1/1pn3bp/p2p2p1/2pPp1PP/P1P1Pp2/2N2N2/1P1B1P2/R2QK2R b KQ - 0 16';
    expect(boardKind(desperado, 'b', -260)).toBeNull();
  });

  it('no counterplay: better, and their pieces reach under half as many squares', () => {
    const fen = 'k7/p7/P7/8/8/8/8/1R2R1K1 w - - 0 1';
    expect(boardKind(fen, 'w', 900)?.kind).not.toBe('drawing-chances');
  });
});
