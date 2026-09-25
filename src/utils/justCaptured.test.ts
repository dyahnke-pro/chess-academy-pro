import { describe, it, expect } from 'vitest';
import { lastMoveCapturedOn } from './justCaptured';
import { pendingRecapture } from './justCaptured';

const LINE = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6 Rd1 Qe8 Nd5 c6 Nc3 Bb4 h3 Bxf3'.split(' ');

describe('lastMoveCapturedOn', () => {
  it('18…Bxf3 just captured on f3', () => {
    expect(lastMoveCapturedOn(LINE, 'f3')).toBe(true);
  });
  it('NEGATIVE CONTROL: a different square, or a quiet last move', () => {
    expect(lastMoveCapturedOn(LINE, 'c3')).toBe(false);
    expect(lastMoveCapturedOn(LINE.slice(0, -1), 'f3')).toBe(false);
  });
});
// Hand walk 2340 (Alapin): standing claims made while a recapture was pending.
describe('pendingRecapture', () => {
  it('names the square when the side to move can take back evenly', () => {
    // 4…cxd4: White retakes with cxd4.
    expect(pendingRecapture(['e4', 'c5', 'Nf3', 'Nc6', 'c3', 'e5', 'd4', 'cxd4'])).toBe('d4');
    // 8…Bxc3: White retakes with Bxc3.
    expect(pendingRecapture('e4 c5 Nf3 Nc6 c3 e5 d4 cxd4 cxd4 d5 exd5 Qxd5 Nc3 Bb4 Bd2 Bxc3'.split(' '))).toBe('c3');
  });
  it('null when the last move was not a capture, or nothing can take back', () => {
    expect(pendingRecapture(['e4', 'c5', 'Nf3'])).toBeNull();
    // 2.Nf3 d5?? 3.exd5 — Black can retake with Qxd5, so it IS pending…
    expect(pendingRecapture(['e4', 'd5', 'exd5'])).toBe('d5');
    // …but a free piece is not an exchange: 1.e4 e5 2.Qh5 Nc6 3.Qxf7+?? Kxf7 is
    // a recapture; after 3…Kxf7 White has nothing to take back with.
    expect(pendingRecapture(['e4', 'e5', 'Qh5', 'Nc6', 'Qxf7+', 'Kxf7'])).toBeNull();
  });
  it('lastMoveCapturedOn still answers its own question', () => {
    expect(lastMoveCapturedOn(['e4', 'd5', 'exd5'], 'd5')).toBe(true);
  });
});

describe('landingSquare — where a move in the history landed', () => {
  it('names the student move one ply before the reply (…Bg4, then c3)', async () => {
    const { landingSquare } = await import('./justCaptured');
    const h = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O', 'f6', 'd4', 'Bg4', 'c3'];
    expect(landingSquare(h, 2)).toBe('g4');
    expect(landingSquare(h, 1)).toBe('c3');
    expect(landingSquare(['e4'], 2)).toBeNull();
  });
});
