import { describe, it, expect } from 'vitest';
import { moveStops } from './moveStops';

// Danya, how to play a brilliancy #2 (27.Rfd1): with the rook on f1, …Qh2 is
// mate (the knight on g4 guards h2, the king has no square). Rfd1 gives the
// king f1. Engine (depth 16) agrees Rfd1 is the move.
const FEN = 'r4rk1/1p3pp1/pPp4p/P1Pp3q/3P1Pn1/2N5/2Q2PB1/R4RK1 w - - 0 27';

describe('moveStops — their mate, stopped', () => {
  it('Rfd1 stops …Qh2 mate and gives the king f1', () => {
    const m = moveStops(FEN, 'Rfd1', true).find((s) => s.kind === 'mate');
    expect(m?.clause).toBe('stops …Qh2, which would be mate, and now your king has f1');
  });
  it('a move that leaves the mate on stops nothing (Qd2)', () => {
    expect(moveStops(FEN, 'Qd2', true).some((s) => s.kind === 'mate')).toBe(false);
  });
  it('no mate threatened, no mate stop', () => {
    expect(moveStops('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e4', true).some((s) => s.kind === 'mate')).toBe(false);
  });
});
