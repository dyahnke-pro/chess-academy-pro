import { describe, it, expect } from 'vitest';
import { sanToWords, movesInWords } from './sanToSpeech';

describe('sanToWords — moves a beginner can read', () => {
  it.each([
    ['Rxd4', 'rook takes on d4'],
    ['exd5', 'e-pawn takes on d5'],
    ['Nf3', 'knight to f3'],
    ['Rad8', 'a-rook to d8'],
    ['Qh5+', 'queen to h5 with check'],
    ['O-O', 'castles kingside'],
    ['e8=Q', 'pawn to e8 and becomes a queen'],
    ['Qxf7#', 'queen takes on f7, checkmate'],
  ])('%s → %s', (san, words) => expect(sanToWords(san)).toBe(words));
});

describe('movesInWords — the notation rides after the words', () => {
  it('rewrites moves, leaves squares and plain words alone', () => {
    expect(movesInWords('Rxd4 was the move — it would take their knight on d4.'))
      .toBe('rook takes on d4 (Rxd4) was the move — it would take their knight on d4.');
    expect(movesInWords('The pawn on d5 is weak. Be careful.')).toBe('The pawn on d5 is weak. Be careful.');
    expect(movesInWords('…Nf6 develops.')).toBe('knight to f6 (…Nf6) develops.');
    expect(movesInWords('Then O-O.')).toBe('Then castles kingside (O-O).');
  });
});
