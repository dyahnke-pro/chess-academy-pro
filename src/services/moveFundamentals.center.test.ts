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
    // …each square with its role (2026-10-15).
    expect(text).toMatch(/center on d4, backing the d-pawn's push there, and e5, attacking the pawn there/);
  });
});

describe('a pawn recapture toward the middle is the take-toward-the-centre rule', () => {
  it('…fxe5 is not "grab space with the pawn to e5"', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O', 'f6', 'd4', 'Bg4', 'c3', 'Bd6', 'Nbd2', 'Ne7', 'h3', 'Bh5', 'dxe5']) c.move(m);
    const f = computeMoveFundamentals(c.fen(), 'fxe5', 'black').find((x) => x.id === 'center');
    expect(f?.imperative ?? '').toMatch(/take toward the center/);
    expect(JSON.stringify(f)).not.toMatch(/grab space/);
  });
});

describe('a hole with their piece on it is said as the piece it hits (A-plan P3)', () => {
  it('Nd5 heading at c3 names their bishop there', () => {
    const text = computeMoveFundamentals('6k1/8/1n6/8/8/2B5/P4PPP/6K1 b - - 0 20', 'Nd5', 'black').map((f) => JSON.stringify(f)).join(' ');
    expect(text).toMatch(/their bishop on c3, a (square|hole) no pawn of theirs can cover/);
  });
});

describe('a saved piece says where it goes to work (Learn audit 2026-10-16)', () => {
  it('Ne4 out of the pawn\'s reach names the bishop it hits', () => {
    // Their pawn on f5 hits the knight on g4; from e5 … use a rescue by a
    // non-pawn attacker: their bishop on d7 hits the knight on g4; Ne5 hits d7.
    const text = computeMoveFundamentals('6k1/3b4/8/8/6N1/8/5PPP/6K1 w - - 0 30', 'Ne5', 'white').map((f) => JSON.stringify(f)).join(' ');
    expect(text).toMatch(/saves it from their bishop on d7, and attacks that bishop from e5/);
    // One "it" per sentence (Learn tape 2026-10-29: "Your queen to a5 saves it
    // from their knight on c3, and hits it back from a5" — the first "it" is
    // the queen, the second the knight).
    expect(text).not.toMatch(/saves it[^"]*hits it/);
  });
});
