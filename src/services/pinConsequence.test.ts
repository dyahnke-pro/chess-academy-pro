import { describe, it, expect } from 'vitest';
import { pinConsequence } from './lookaheadPlan';

describe('a pin says what it holds (Learn audit 2026-10-14)', () => {
  it('names the piece behind and who takes it', () => {
    // Black rook d8 pins the white knight d4 to the queen d1.
    const fen = '3r2k1/5ppp/8/8/3N4/8/5PPP/3Q2K1 b - - 0 1';
    expect(pinConsequence(fen, ['d8', 'd4', 'd1'], 'b')).toBe('If their knight moves, the queen on d1 is open to your rook.');
  });
  it('against the king the pinned piece cannot move', () => {
    const fen = '6k1/5ppp/8/1b6/8/3N4/5PPP/5K2 b - - 0 1';
    expect(pinConsequence(fen, ['b5', 'd3', 'f1'], 'b')).toBe('Their knight cannot move at all — the king is behind it.');
  });
  it('stays quiet when the squares are not a pin', () => {
    expect(pinConsequence('8/8/8/8/8/8/8/K6k w - - 0 1', ['a1'], 'w')).toBeNull();
  });
});
