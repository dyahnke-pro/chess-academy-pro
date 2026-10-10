import { describe, it, expect } from 'vitest';
import { openSentence, continueSentence } from './openSentence';

describe('openSentence', () => {
  it('capitalises a spoken opening word', () => {
    expect(openSentence('bishop to b5 with check (Bb5+) is the best move here.')).toBe('Bishop to b5 with check (Bb5+) is the best move here.');
    expect(openSentence('castles kingside (O-O) is the best move.')).toBe('Castles kingside (O-O) is the best move.');
  });
  it('leaves notation and already-capitalised text alone', () => {
    expect(openSentence('e4 is attacked once.')).toBe('e4 is attacked once.');
    expect(openSentence('dxe5 wins a pawn.')).toBe('dxe5 wins a pawn.');
    expect(openSentence('Their knight is loose.')).toBe('Their knight is loose.');
    expect(openSentence('')).toBe('');
  });
});

describe('continueSentence', () => {
  it('lowers a plain leading word', () => {
    expect(continueSentence('Their knight is loose.')).toBe('their knight is loose.');
    expect(continueSentence('Bad trade for you.')).toBe('bad trade for you.');
  });
  it('keeps a move, castling and "I" as written', () => {
    expect(continueSentence('Nxe4 wins a pawn.')).toBe('Nxe4 wins a pawn.');
    expect(continueSentence('Qd2+ forks them.')).toBe('Qd2+ forks them.');
    expect(continueSentence('Rfe1 brings the rook.')).toBe('Rfe1 brings the rook.');
    expect(continueSentence('O-O tucks the king away.')).toBe('O-O tucks the king away.');
    expect(continueSentence('I see it.')).toBe('I see it.');
    expect(continueSentence('e4 is attacked.')).toBe('e4 is attacked.');
  });
});
