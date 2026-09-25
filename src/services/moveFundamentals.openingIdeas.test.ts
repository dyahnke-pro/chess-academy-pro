// The opening ideas past "develop / center" (review audit 2026-09-25): each
// principle is taught once a game, so the Ruy's Bb5, Ba4, c3, Nbd2 and Re1 had
// nothing new to say and six owed plies went silent. Real game: Carlsen–Caruana,
// Saint Louis Blitz 2019 (lichess jYSkjcuG).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFundamentals } from './moveFundamentals';

const RUY = 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 d3 d6 c3 g6 Bg5 Bg7 Nbd2 h6 Bh4 O-O O-O b5 Bc2 Qe8 Re1'.split(' ');
function idsAt(sans: string[], i: number): string[] {
  const c = new Chess();
  for (const s of sans.slice(0, i)) c.move(s);
  return computeMoveFundamentals(c.fen(), sans[i], c.turn() === 'w' ? 'white' : 'black').map((f) => f.id);
}
const at = (san: string): number => RUY.indexOf(san);

describe('opening ideas past develop / center', () => {
  it('Bb5 goes after the only guard of e5', () => {
    expect(idsAt(RUY, at('Bb5'))).toContain('attack-defender');
  });
  it('Ba4 steps out of the pawn’s reach and keeps hitting c6', () => {
    expect(idsAt(RUY, at('Ba4'))).toContain('keep-working');
  });
  it('c3 prepares d4 behind the d3 pawn', () => {
    expect(idsAt(RUY, at('c3'))).toContain('prepare-break');
  });
  it('Nbd2 finishes development', () => {
    expect(idsAt(RUY, at('Nbd2'))).toContain('development-complete');
  });
  it('Re1 goes behind the e4 pawn on the closed e-file', () => {
    expect(idsAt(RUY, at('Re1'))).toContain('rook-behind-pawn');
  });

  it('negative controls: none of them fire where the board says no', () => {
    // Nf3 attacks e5, whose only guard is nothing yet — no defender to go after.
    expect(idsAt(RUY, at('Nf3'))).not.toContain('attack-defender');
    // Nf3 is not the last minor out.
    expect(idsAt(RUY, at('Nf3'))).not.toContain('development-complete');
    // A bishop move no pawn attacked is not a retreat.
    expect(idsAt(RUY, at('Bg5'))).not.toContain('keep-working');
    // d3 has no pawn behind d4 to prepare (it IS the d-pawn).
    expect(idsAt(RUY, at('d3'))).not.toContain('prepare-break');
    // A rook to an open file is open-file, not behind-the-pawn.
    const open = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
    expect(computeMoveFundamentals(open, 'Rd1', 'white').map((f) => f.id)).not.toContain('rook-behind-pawn');
  });
});
