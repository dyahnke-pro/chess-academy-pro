import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFundamentals } from './moveFundamentals';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const tempo = (fen: string, san: string, side: 'white' | 'black'): string | undefined =>
  computeMoveFundamentals(fen, san, side).find((f) => f.id === 'tempo')?.led;

// The writers' line (Nimzo-Indian, 4.Bg5 h6): "Black drives the bishop back,
// so as to gain the ability to play …g5 and break the pin at a later time."
describe('a kick that prepares the pin break', () => {
  it('h6 against the bishop pinning the knight to the queen says …g5 breaks it from h4', () => {
    const fen = fenAfter(['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Bg5']);
    expect(tempo(fen, 'h6', 'black')).toBe('kicks their bishop off g5, gaining time. If it keeps the pin from h4, …g5 breaks it');
  });
  it('White the same: h3 against …Bg4 pinning the knight on f3 to the queen', () => {
    const fen = fenAfter(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'Nc3', 'Nc6']);
    expect(tempo(fen, 'h3', 'white')).toMatch(/If it keeps the pin from h5, g4 breaks it$/);
  });
  it('…g5 against the bishop on h4: the kick itself breaks the pin', () => {
    const fen = fenAfter(['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Bg5', 'h6', 'Bh4']);
    expect(tempo(fen, 'g5', 'black')).toBe('kicks their bishop off h4, gaining time, and it breaks the pin on your knight');
  });
  it('no pin, no break: a plain kick says only the kick', () => {
    // The e7-pawn stands between the knight and the queen: nothing is pinned.
    const fen = fenAfter(['d4', 'Nf6', 'Bg5', 'd5', 'e3']);
    expect(tempo(fen, 'h6', 'black')).toBe('kicks their bishop off g5, gaining time');
  });
});
