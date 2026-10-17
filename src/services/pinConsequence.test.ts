import { describe, it, expect } from 'vitest';
import { pinConsequence } from './lookaheadPlan';

describe('a pin says what it holds (Learn audit 2026-10-14)', () => {
  it('names the piece behind and who takes it', () => {
    // Black rook d8 pins the white knight d4 to the queen d1.
    const fen = '3r2k1/5ppp/8/8/3N4/8/5PPP/3Q2K1 b - - 0 1';
    expect(pinConsequence(fen, ['d8', 'd4', 'd1'], 'b', 'student', 0)).toBe('If their knight moves, their queen on d1 is open to your rook.');
  });
  it('against the king the pinned piece cannot move', () => {
    const fen = '6k1/5ppp/8/1b6/8/3N4/5PPP/5K2 b - - 0 1';
    expect(pinConsequence(fen, ['b5', 'd3', 'f1'], 'b', 'student', 0)).toBe('Their knight on d3 cannot move at all — the king on f1 is behind it.');
  });
  it('the king pin names its squares and rotates, so a second pin is not dropped as already said (prod Learn 2026-10-17)', () => {
    const fen = '6k1/5ppp/8/1b6/8/3N4/5PPP/5K2 b - - 0 1';
    const said = [0, 1, 2].map((r) => pinConsequence(fen, ['b5', 'd3', 'f1'], 'b', 'student', r));
    expect(new Set(said).size).toBe(3);
    for (const x of said) expect(x).toMatch(/d3/);
  });
  it('stays quiet when the squares are not a pin', () => {
    expect(pinConsequence('8/8/8/8/8/8/8/K6k w - - 0 1', ['a1'], 'w', 'student', 0)).toBeNull();
  });
  it('a pin on the student is said from their seat', () => {
    // White rook h5 pins Black's bishop c5 to the queen a5.
    const fen = '6k1/8/8/q1b4R/8/8/8/6K1 b - - 0 1';
    expect(pinConsequence(fen, ['h5', 'c5', 'a5'], 'b', 'opponent', 0)).toBe('If your bishop moves, your queen on a5 is open to their rook.');
  });
  it('rotates its wording by move (no formula three times a game)', () => {
    const fen = '3r2k1/5ppp/8/8/3N4/8/5PPP/3Q2K1 b - - 0 1';
    const said = [0, 1, 2].map((r) => pinConsequence(fen, ['d8', 'd4', 'd1'], 'b', 'student', r));
    expect(new Set(said).size).toBe(3);
    for (const x of said) expect(x).toMatch(/queen on d1/);
  });
});
