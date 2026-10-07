import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findPinPressure, isPinPressureMove } from './pinPressure';

// Bg5 pins the f6-knight to the queen on d8 (e7 is empty), and e4-e5 attacks
// the knight with a pawn: the knight cannot step away without losing the
// queen, and NOTHING can kick the bishop — Black's g- and h-pawns are gone.
const PILE_ON = 'r1bqk2r/p2p1p2/p1n1pn2/6B1/3PP3/2P5/P4PPP/R2QK1NR w KQkq - 0 9';
// The French-shaped board this file used to call a win: after e5, ...h6 hits
// the bishop and the pin breaks with tempo (...h6 Bh4 g5 Bg3), so e5 wins
// nothing. The old fixture asserted the false claim (walk 2026-10-07).
const KICKABLE = 'rnbqkb1r/ppp2ppp/4pn2/3p2B1/3PP3/2N5/PPP2PPP/R2QKBNR w KQkq - 0 5';
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

  it('is silent when the pinned side can kick the pinner with a pawn (the pin breaks with tempo)', () => {
    expect(findPinPressure(KICKABLE).flatMap((x) => x.moves.map((m) => m.san))).not.toContain('e5');
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

describe('pinPressure — against the student', () => {
  it('reads the opponent\'s pile-on threat on the student\'s pinned piece (either seat, one computer)', async () => {
    const { findPinPressure: f, pinPressureThreat } = await import('./pinPressure');
    // Black to move on the pile-on board: White holds the pin, so the threat
    // against Black's knight is e5 — the same answer read from Black's seat.
    const blackToMove = PILE_ON.replace(' w KQkq', ' b KQkq');
    const threat = f(blackToMove, 'w');
    expect(threat[0]?.pinned).toBe('f6');
    expect(threat[0]?.moves[0].san).toBe('e5');
    expect(pinPressureThreat(PILE_ON)[0]?.pinned).toBe('f6');
  });
});

describe('the pin that breaks with tempo (David 2026-10-07)', () => {
  it('note 487: Bg5 pins Nf6, but ...h6 kicks the pinner, so e5 wins nothing', () => {
    const c = new Chess();
    for (const s of ['e4', 'c5', 'c3', 'Nc6', 'd4', 'cxd4', 'cxd4', 'e6', 'Nc3', 'Bb4', 'Bg5', 'Nf6', 'Ba6', 'Bxc3+', 'bxc3', 'bxa6']) c.move(s);
    const pp = findPinPressure(c.fen());
    expect(pp.flatMap((p) => p.moves.map((m) => m.san))).not.toContain('e5');
  });

  it('control: with no pawn able to reach the pinner, the pressure still stands', () => {
    expect(findPinPressure(PILE_ON).flatMap((p) => p.moves.map((m) => m.san))).toContain('e5');
  });
});
