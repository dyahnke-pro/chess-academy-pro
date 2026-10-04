import { describe, it, expect } from 'vitest';
import { wrongTapTag } from './wrongTapTag';

describe('wrongTapTag — which wrong square says why', () => {
  // White to move. Black knight e5 is loose (attacked by d4, no defender);
  // black knight c6 is attacked by the b5 bishop but defended by b7 and d7.
  const FEN = '4k3/1p1p4/2n5/1B2n3/3P4/8/8/4K3 w - - 0 1';

  it('a defended piece tapped as "hanging" → the defenders were not counted (the question tag)', () => {
    expect(wrongTapTag({ fen: FEN, key: ['e5'], square: 'c6', questionTag: 'hung-material', studentColor: 'w' })).toBe('hung-material');
  });

  it('their piece when asked about yours → missed-opponents-threat', () => {
    // Asked about White's loose bishop (b5 attacked by c6? no — use a key of a white piece).
    expect(wrongTapTag({ fen: FEN, key: ['b5'], square: 'e5', questionTag: 'hung-material', studentColor: 'w' })).toBe('missed-opponents-threat');
  });

  it('is conservative: an empty square, a key square, a non-counting question → null', () => {
    expect(wrongTapTag({ fen: FEN, key: ['e5'], square: 'a3', questionTag: 'hung-material', studentColor: 'w' })).toBeNull();
    expect(wrongTapTag({ fen: FEN, key: ['e5'], square: 'e5', questionTag: 'hung-material', studentColor: 'w' })).toBeNull();
    expect(wrongTapTag({ fen: FEN, key: ['e5'], square: 'c6', questionTag: 'misplaced-piece', studentColor: 'w' })).toBeNull();
    expect(wrongTapTag({ fen: FEN, key: ['e5'], square: 'c6', questionTag: null, studentColor: 'w' })).toBeNull();
  });

  it('an undefended non-key piece is not read as "did not count defenders"', () => {
    // d7 pawn: not attacked by White at all → null.
    expect(wrongTapTag({ fen: FEN, key: ['e5'], square: 'd7', questionTag: 'hung-material', studentColor: 'w' })).toBeNull();
  });

  it('an unreadable board → null', () => {
    expect(wrongTapTag({ fen: 'not a fen', key: ['e5'], square: 'c6', questionTag: 'hung-material', studentColor: 'w' })).toBeNull();
  });
});
