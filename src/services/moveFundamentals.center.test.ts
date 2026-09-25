import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFundamentals } from './moveFundamentals';

// Hand walk 800 (Ruy Exchange): …Bg4 was "develop into the game, fighting for
// the center on f5" — f5 alone is a flank square, not the center.
describe('the center clause needs the core four', () => {
  it('…Bg4 eyeing only f5 is not "fighting for the center"', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O', 'f6', 'd4']) c.move(m);
    const text = computeMoveFundamentals(c.fen(), 'Bg4', 'black').map((f) => JSON.stringify(f)).join(' ');
    expect(text).not.toMatch(/center on f5/);
  });
  it('a knight hitting d4 and e5 still fights for the center', () => {
    const c = new Chess();
    c.move('e4'); c.move('e5');
    const text = computeMoveFundamentals(c.fen(), 'Nf3', 'white').map((f) => JSON.stringify(f)).join(' ');
    expect(text).toMatch(/center on d4 and e5/);
  });
});
