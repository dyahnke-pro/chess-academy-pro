import { Chess } from 'chess.js';
import { describe, it, expect } from 'vitest';
import {
  materialBalance,
  nonPawnMaterial,
  detectPhase,
  continuationNarration,
  continuationResult,
  initialContinuationState,
} from './narratedContinuation';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('narratedContinuation helpers', () => {
  it('materialBalance is 0 at the start, positive when White is up', () => {
    expect(materialBalance(START)).toBe(0);
    // White up a knight (remove a black knight)
    expect(materialBalance('rnbqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(3);
    // Black up a rook (remove a white rook)
    expect(materialBalance('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR w Kkq - 0 1')).toBe(-5);
  });

  it('detectPhase: the board decides — development, not the move count', () => {
    expect(detectPhase(START, 2)).toBe('opening');
    // Nothing developed is still the opening, whatever the ply (census 14).
    expect(detectPhase(START, 20)).toBe('opening');
    // Both sides castled with rooks connected: the middlegame.
    expect(detectPhase('r4rk1/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R4RK1 w - - 0 10', 18)).toBe('middlegame');
    // No queens → endgame regardless of ply
    expect(detectPhase('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 30)).toBe('endgame');
    expect(nonPawnMaterial('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toBe(0);
  });

  it('announces a phase transition once', () => {
    const s0 = initialContinuationState(START, 2);
    // A real middlegame board — both sides castled, rooks connected (census
    // 14: the board decides the phase, not the ply).
    const MID = 'r4rk1/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R4RK1 w - - 0 10';
    const r = continuationNarration(MID, 18, s0, null, 'w');
    expect(r.text).toMatch(/middlegame/i);
    // same phase next move → silent
    const r2 = continuationNarration(MID, 19, r.state, null, 'w');
    expect(r2.text).toBeNull();
  });

  it('announces a decisive material swing once, then stays quiet', () => {
    const s0 = initialContinuationState(START, 20); // already middlegame
    const upAPiece = 'rnbqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // white +3
    const r = continuationNarration(upAPiece, 22, s0, null, 'w');
    expect(r.text).toMatch(/a piece up/i); // named by the board (boardEdgeWords), not a point threshold
    // ONE PERSPECTIVE: the student's lead is "you", never "White".
    expect(r.text).toMatch(/^You're /);
    expect(continuationNarration(upAPiece, 22, s0, null, 'b').text).toMatch(/^They're /);
    // same balance next move → no repeat
    const r2 = continuationNarration(upAPiece, 23, r.state, null, 'w');
    expect(r2.text).toBeNull();
  });

  it('a recapture midpoint is not "up a piece" (WO-MATERIAL-01)', () => {
    const s0 = { phase: 'middlegame' as const, announcedBalance: 0 };
    // Bxf6 just took a knight; …gxf6 (or …Bxf6) retakes — level, not +3.
    const c = new Chess();
    for (const m of 'd4 Nf6 c4 e6 Nc3 d5 Bg5 Be7 Nf3 O-O e3 h6 Bxf6'.split(' ')) c.move(m);
    const last = c.history({ verbose: true }).at(-1)!;
    expect(continuationNarration(c.fen(), 26, s0, { to: last.to, captured: last.captured ?? null }, 'w').text).toBeNull();
  });

  it('stays silent on a routine, level move', () => {
    const s0 = { phase: 'middlegame' as const, announcedBalance: 0 };
    expect(continuationNarration(START, 24, s0, null, 'w').text).toBeNull();
  });

  it('names the winner on checkmate (side to move is the mated side)', () => {
    expect(continuationResult(true, false, 'b', 'w')).toMatch(/you win/);
    expect(continuationResult(true, false, 'w', 'w')).toMatch(/they win/);
    expect(continuationResult(false, true, 'w', 'w')).toMatch(/draw/i);
  });
});
