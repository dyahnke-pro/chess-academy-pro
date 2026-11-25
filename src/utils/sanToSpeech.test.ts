import { describe, it, expect } from 'vitest';
import { sanToSpeech } from './sanToSpeech';

describe('sanToSpeech — Learn dictates the move', () => {
  it('piece moves', () => {
    expect(sanToSpeech('Nf3')).toBe('Knight to f 3');
    expect(sanToSpeech('Bf5')).toBe('Bishop to f 5');
    expect(sanToSpeech('Be4')).toBe('Bishop to e 4');
    expect(sanToSpeech('Qd6')).toBe('Queen to d 6');
  });
  it('speaks disambiguation letters/digits', () => {
    expect(sanToSpeech('Ngf6')).toBe('g-knight to f 6');
    expect(sanToSpeech('N2f3')).toBe('Knight from the second rank to f 3');
    expect(sanToSpeech('Nbd7')).toBe('b-knight to d 7');
    expect(sanToSpeech('Rad8')).toBe('a-rook to d 8');
    expect(sanToSpeech('Nbxd2')).toBe('b-knight takes d 2');
    expect(sanToSpeech('Qh4e1')).toBe('Queen from h 4 to e 1');
  });
  it('never says a bare piece-letter shape the leak alarm flags (prod 2026-09..11)', async () => {
    const { detectSanitizerLeak } = await import('../services/voiceService');
    for (const san of ['Nbd7', 'Nbd2', 'Rad8', 'Rfe1', 'Nbxd2', 'Qh4e1', 'N2f3', 'bxc5', 'exd5', 'Bxf7+']) {
      expect(detectSanitizerLeak(sanToSpeech(san)), san).toBe(false);
    }
  });
  it('captures', () => {
    expect(sanToSpeech('Nxd4')).toBe('Knight takes d 4');
    expect(sanToSpeech('exd5')).toBe('e-pawn takes d 5');
    expect(sanToSpeech('cxd5')).toBe('c-pawn takes d 5');
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
