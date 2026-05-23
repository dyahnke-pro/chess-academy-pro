import { describe, it, expect } from 'vitest';
import { sanToSpeech } from './sanToSpeech';

describe('sanToSpeech — Learn dictates the move', () => {
  it('piece moves', () => {
    expect(sanToSpeech('Nf3')).toBe('Knight to f 3');
    expect(sanToSpeech('Bf5')).toBe('Bishop to f 5');
    expect(sanToSpeech('Be4')).toBe('Bishop to e 4');
    expect(sanToSpeech('Qd6')).toBe('Queen to d 6');
  });
  it('drops disambiguation letters/digits', () => {
    expect(sanToSpeech('Ngf6')).toBe('Knight to f 6');
    expect(sanToSpeech('N2f3')).toBe('Knight to f 3');
    expect(sanToSpeech('Nbd7')).toBe('Knight to d 7');
  });
  it('captures', () => {
    expect(sanToSpeech('Nxd4')).toBe('Knight takes d 4');
    expect(sanToSpeech('exd5')).toBe('e takes d 5');
    expect(sanToSpeech('cxd5')).toBe('c takes d 5');
  });
  it('pawn pushes', () => {
    expect(sanToSpeech('e5')).toBe('Pawn to e 5');
    expect(sanToSpeech('c6')).toBe('Pawn to c 6');
  });
  it('castling', () => {
    expect(sanToSpeech('O-O')).toBe('Castle kingside');
    expect(sanToSpeech('O-O-O')).toBe('Castle queenside');
  });
  it('check / mate / promotion suffixes', () => {
    expect(sanToSpeech('Re8+')).toBe('Rook to e 8, check');
    expect(sanToSpeech('Nd6#')).toBe('Knight to d 6, checkmate');
    expect(sanToSpeech('e8=Q')).toBe('Pawn to e 8, promote to Queen');
    expect(sanToSpeech('Qxd6+')).toBe('Queen takes d 6, check');
  });
  it('handles empty', () => {
    expect(sanToSpeech('')).toBe('');
    expect(sanToSpeech(null)).toBe('');
  });
});
