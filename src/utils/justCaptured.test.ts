import { describe, it, expect } from 'vitest';
import { lastMoveCapturedOn } from './justCaptured';

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
