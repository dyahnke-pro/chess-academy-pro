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
      .toBe('Rook takes on d4 (Rxd4) was the move — it would take their knight on d4.');
    expect(movesInWords('The pawn on d5 is weak. Be careful.')).toBe('The pawn on d5 is weak. Be careful.');
    expect(movesInWords('…Nf6 develops.')).toBe('Knight to f6 (…Nf6) develops.');
    expect(movesInWords('Then O-O.')).toBe('Then castles kingside (O-O).');
  });

  it('a move inside an opening NAME is part of the name (chat-surfaces audit 2026-11-06)', () => {
    // Learn read "Sure — let's walk through the Caro-Kann Defense: Tartakower
    // (knight to f6 (Nf6)) Variation". Names are not moves.
    expect(movesInWords("Sure — let's walk through the Caro-Kann Defense: Tartakower (Nf6) Variation."))
      .toBe("Sure — let's walk through the Caro-Kann Defense: Tartakower (Nf6) Variation.");
    expect(movesInWords('Ready — the Scotch Gambit (4.Bc4), then O-O.')).toBe('Ready — the Scotch Gambit (4.Bc4), then castles kingside (O-O).');
    expect(movesInWords('The London System, with Bd3 is solid. Then Nf3 develops.'))
      .toBe('The London System, with Bd3 is solid. Then knight to f3 (Nf3) develops.');
    expect(movesInWords('Benko Gambit: Nd2 Variation — after Nd2 the knight heads for c4.'))
      .toBe('Benko Gambit: Nd2 Variation — after knight to d2 (Nd2) the knight heads for c4.');
    expect(movesInWords('Trompowsky Attack: 2...Ne4 3.Bf4 Main Line')).toBe('Trompowsky Attack: 2...Ne4 3.Bf4 Main Line');
  });
});
