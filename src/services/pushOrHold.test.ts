import { describe, it, expect } from 'vitest';
import { pushOrHold } from './pushOrHold';

// Opposite-coloured bishops, White a pawn up: Bc4 (light) vs Bf8 (dark).
const OCB = '5bk1/5ppp/8/8/2B5/8/4PPPP/6K1 w - - 0 1';
// Rook ending, White a pawn up.
const ROOK = '6k1/5ppp/8/8/8/8/4PPPP/R5K1 w - - 0 1'.replace('6k1', 'r5k1');

describe('pushOrHold — what a pawn is worth in THIS ending', () => {
  it('opposite-coloured bishops a pawn up: drawish, need a second passer', () => {
    expect(pushOrHold(OCB, 'w', 120)?.text).toMatch(/^Opposite-coloured bishops — drawish/);
  });

  it('the same ending a pawn down: blockade on your bishop\'s colour', () => {
    expect(pushOrHold(OCB, 'b', -120)?.side).toBe('down');
  });

  it('rook ending a pawn up: the hardest edge to convert', () => {
    expect(pushOrHold(ROOK, 'w', 90)?.text).toMatch(/rook ending — the hardest edge/);
  });

  it('says nothing once the engine calls it won — that is technique, not a choice', () => {
    expect(pushOrHold(ROOK, 'w', 400)).toBeNull();
  });

  it('says nothing when the engine disagrees with the pawn count', () => {
    expect(pushOrHold(ROOK, 'w', -80)).toBeNull();
  });

  it('says nothing in a middlegame', () => {
    expect(pushOrHold('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 'w', 100)).toBeNull();
  });
});
