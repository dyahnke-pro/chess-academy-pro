import { describe, it, expect } from 'vitest';
import { computeMustDefend, flipSideToMove } from './threatOut';

describe('flipSideToMove', () => {
  it('flips the side and clears en-passant', () => {
    const f = flipSideToMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    expect(f).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
  });
  it('returns null on a malformed FEN', () => {
    expect(flipSideToMove('not a fen')).toBeNull();
  });
});

describe('computeMustDefend — the null-move must-defend', () => {
  it('flags a piece hanging to the opponent’s next move', () => {
    // White Ne5, Black d6 pawn: give Black the move → …dxe5 wins the knight.
    const md = computeMustDefend('rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', 'w');
    expect(md.net).toBe(3);
    expect(md.pieces[0]).toMatchObject({ square: 'e5', piece: 'n', value: 3 });
  });

  it('returns nothing when no mover piece hangs', () => {
    // Quiet position after 1.e4 — nothing of Black's hangs to a White free move.
    const md = computeMustDefend('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'b');
    expect(md.net).toBe(0);
    expect(md.pieces).toHaveLength(0);
  });

  it('never counts the king, and returns nothing when the mover is in check', () => {
    // White is in check (…Qh4+): no free tempo to hand over — probe stays silent.
    const md = computeMustDefend('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', 'w');
    expect(md.net).toBe(0);
  });

  it('reports the biggest hanging piece first (net = its value)', () => {
    // White queen on d5 undefended, Black to be given the move → …exd5 / …anything wins it.
    // Construct: White Qd5 attacked by Black e6 pawn, undefended.
    const md = computeMustDefend('rnbqkbnr/pppp1ppp/4p3/3Q4/8/8/PPPP1PPP/RNB1KBNR w KQkq - 0 1', 'w');
    expect(md.net).toBe(9);
    expect(md.pieces[0].square).toBe('d5');
  });
});
