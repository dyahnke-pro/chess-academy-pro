import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { discoveredAttacks } from './discoveredAttack';
import { answeringMove } from './answeringMove';

describe('the discovered attack, proven', () => {
  it('Nc6+ uncovers the rook on e1 at the king and wins the queen on b8', () => {
    const d = discoveredAttacks('1q2k3/8/8/4N3/8/8/8/4R1K1 w - - 0 1')[0];
    expect(d.san).toBe('Nc6+');
    expect(d.uncovered).toEqual({ square: 'e1', piece: 'r' });
    expect(d.target).toEqual({ square: 'e8', piece: 'k' });
    expect(d.gain).toBeGreaterThanOrEqual(9);
  });
  it('a piece that was simply hanging is no discovery (the queen on c4 was free already)', () => {
    expect(discoveredAttacks('4k3/8/8/4N3/2q5/8/8/4R1K1 w - - 0 1')).toEqual([]);
  });
  it('an opening board has none', () => {
    const c = new Chess(); for (const m of 'e4 e5 Nf3 Nc6 Bc4 Bc5'.split(' ')) c.move(m);
    expect(discoveredAttacks(c.fen())).toEqual([]);
  });
  it('a discovery every reply answers is not said (the queen just steps away)', () => {
    // Ne5 moves off the e-file onto nothing: Re1 hits the queen on e8, which
    // simply moves, and the knight's square threatens nothing.
    expect(discoveredAttacks('4q1k1/5ppp/8/4N3/8/8/5PPP/3QR1K1 w - - 0 1').filter((x) => x.target.piece === 'q' && x.gain >= 2 && !/x|\+/.test(x.san))).toEqual([]);
  });
});

describe('the answering move: every natural answer tried', () => {
  it('only Nb3 holds the knight on a1 (Nc2 runs into the bishop on f5)', () => {
    const a = answeringMove('7k/8/8/4bb2/8/8/8/N6K w - - 0 1');
    expect(a?.san).toBe('Nb3');
    expect(a?.target).toEqual({ square: 'a1', piece: 'n' });
    expect(a?.refuted?.san).toBe('Nc2');
  });
  it('a threat with several answers says nothing', () => {
    expect(answeringMove('k7/8/8/8/1p6/2N5/8/K7 w - - 0 1')).toBeNull();
  });
});
