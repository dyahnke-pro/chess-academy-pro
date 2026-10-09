import { describe, it, expect } from 'vitest';
import { openSentence } from './openSentence';

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
