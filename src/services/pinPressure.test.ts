import { describe, it, expect } from 'vitest';
import { findPinPressure, isPinPressureMove } from './pinPressure';

// Bg5 pins the f6-knight to the queen on d8 (e7 has gone), and e4-e5 attacks
// the knight with a pawn: the knight cannot step away without losing the queen.
const PILE_ON = 'rnbqkb1r/ppp2ppp/4pn2/3p2B1/3PP3/2N5/PPP2PPP/R2QKBNR w KQkq - 0 5';
// The same pin with no pawn on e4: nothing piles on cleanly.
const NO_PAWN = 'rnbqkb1r/ppp2ppp/4pn2/3p2B1/3P4/2N5/PPP2PPP/R2QKBNR w KQkq - 0 5';

describe('pinPressure — put pressure on the pinned piece', () => {
  it('finds the pawn that piles on the pinned knight, pawn moves first', () => {
    const p = findPinPressure(PILE_ON);
    expect(p).toHaveLength(1);
    expect(p[0].pinned).toBe('f6');
    expect(p[0].pinner).toBe('g5');
    expect(p[0].pinnedPiece).toBe('n');
    expect(p[0].moves[0]).toMatchObject({ san: 'e5', byPawn: true });
  });

  it('is silent when nothing piles on and wins (a pin alone is not this principle)', () => {
    const p = findPinPressure(NO_PAWN);
    expect(p.every((x) => x.moves.every((m) => !m.byPawn))).toBe(true);
  });

  it('matches a played move by its squares, never its SAN', () => {
    expect(isPinPressureMove(PILE_ON, 'e4', 'e5')).toBe(true);
    expect(isPinPressureMove(PILE_ON, 'a2', 'a3')).toBe(false);
  });

  it('only for the side to move holding the pin', () => {
    // Same board, Black to move: the pin is White's, so Black has nothing to pile on.
    const black = PILE_ON.replace(' w KQkq', ' b KQkq');
    expect(findPinPressure(black)).toEqual([]);
  });
});
