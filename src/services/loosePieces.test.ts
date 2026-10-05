import { describe, it, expect } from 'vitest';
import { findLoosePieces } from './loosePieces';

describe('findLoosePieces — undefended, attacked or not (loose ≠ hanging)', () => {
  it('an undefended queen nobody attacks is loose, not attacked (walk 2026-10-04, defect 13)', () => {
    const fen = '6k1/5ppp/8/8/1Q6/8/5PPP/6K1 b - - 0 1';
    expect(findLoosePieces(fen, 'w')).toEqual([{ square: 'b4', type: 'q', color: 'w', value: 9, attackers: [], attacked: false }]);
  });
  it('reports both sides in board order, with attackers when attacked', () => {
    // White knight e5 undefended and hit by the d6 pawn; Black bishop b4 undefended (it guards d6).
    const fen = '4k3/8/3p4/4N3/1b6/8/8/4K3 w - - 0 1';
    const all = findLoosePieces(fen);
    expect(all.map((p) => p.square)).toEqual(['e5', 'b4']);
    const n = all.find((p) => p.square === 'e5');
    expect(n?.attacked).toBe(true);
    expect(n?.attackers).toEqual(['d6']);
    expect(all.find((p) => p.square === 'b4')?.attacked).toBe(false);
  });
  it('a defended piece is never loose; kings are never listed', () => {
    expect(findLoosePieces('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1').map((p) => p.square)).toEqual(['d5', 'e4']);
    // c4 defends nothing on d5 for White; the white e4 is defended by nothing but d5 is attacked twice.
    expect(findLoosePieces('4k3/8/8/3p4/2P1P3/8/8/4K3 w - - 0 1', 'b').map((p) => p.square)).toEqual(['d5']);
    expect(findLoosePieces('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toEqual([]);
  });
  it('a bad FEN is empty, never a throw', () => {
    expect(findLoosePieces('not a fen')).toEqual([]);
  });
});
