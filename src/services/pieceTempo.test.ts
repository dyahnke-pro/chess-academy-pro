import { describe, expect, it } from 'vitest';
import { pieceTempo } from './pieceTempo';

// Danya have-check board positional-combinations#0: "the knight on d7 can move
// away with gain of tempo (...Nb6 or ...Ne5, attacking the light-squared bishop)".
const PC = 'r1b1r1k1/1pqn1ppp/p1pb1n2/5N2/2B1P3/2N4P/PPQ2PP1/R1BR2K1 b - - 0 14';
const L = [{ moves: ['d6h2', 'g1h1', 'd7b6', 'c4f1'], cp: -14, mate: null }, { moves: ['d6f8', 'c1g5'], cp: 7, mate: null }, { moves: ['d6e5', 'f2f4'], cp: 10, mate: null }];

describe('pieceTempo', () => {
  it('reads the Danya board', () => {
    const r = pieceTempo(PC, L, 'b');
    expect(r?.from).toBe('d7');
    expect(r?.target).toBe('c4');
    expect(r?.moves.sort()).toEqual(['Nb6', 'Ne5']);
    expect(r?.text).toContain('Your knight on d7 can move with tempo');
  });
  it('a move the engine reads more than a pawn worse is never offered', () => {
    const bad = [{ moves: ['d6h2'], cp: -14, mate: null }, { moves: ['d7b6'], cp: 200, mate: null }, { moves: ['d7e5'], cp: 200, mate: null }];
    expect(pieceTempo(PC, bad, 'b')).toBeNull();
  });
  it('stays silent on the opening board', () => {
    expect(pieceTempo('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', null, 'b')).toBeNull();
  });
});
