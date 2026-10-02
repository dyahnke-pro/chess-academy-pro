// "The e-file is open toward their king" must come with the step that uses it
// (walk 2026-09-30). The helper names a rook move onto the file, landing where
// nothing of theirs attacks it — or nothing.
import { describe, it, expect } from 'vitest';
import { castleOffFile, heavyPieceToFile } from './positionalRead';

describe('heavyPieceToFile', () => {
  it('names the rook move onto the open file', () => {
    // White rook f1, e-file open, nothing covers e1.
    const s = heavyPieceToFile('6k1/8/8/8/8/8/8/K4R2 w - - 0 1', 'w', 'e');
    expect(s).toMatchObject({ san: 'Re1', piece: 'rook' });
  });

  it('refuses a landing square the other side attacks', () => {
    // Black rook on e8 covers the whole e-file: Re1 would hang.
    expect(heavyPieceToFile('4r1k1/8/8/8/8/8/8/K4R2 w - - 0 1', 'w', 'e')).toBeNull();
  });

  it('says nothing when a rook is already on the file', () => {
    expect(heavyPieceToFile('6k1/8/8/8/8/8/8/K3R3 w - - 0 1', 'w', 'e')).toBeNull();
  });
});

describe('castleOffFile', () => {
  it('returns short castling when it is legal', () => {
    expect(castleOffFile('4k3/8/8/8/8/8/8/4K2R w K - 0 1', 'w')).toBe('O-O');
  });
  it('null when castling is gone', () => {
    expect(castleOffFile('4k3/8/8/8/8/8/8/4K2R w - - 0 1', 'w')).toBeNull();
  });
});
