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

  it('detectPhase: opening → middlegame by ply, endgame when queens off', () => {
    expect(detectPhase(START, 2)).toBe('opening');
    expect(detectPhase(START, 20)).toBe('middlegame');
    // No queens → endgame regardless of ply
    expect(detectPhase('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 30)).toBe('endgame');
    expect(nonPawnMaterial('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toBe(0);
  });

  it('announces a phase transition once', () => {
    const s0 = initialContinuationState(START, 2);
    // move into middlegame territory (ply 18, full board still)
    const r = continuationNarration(START, 18, s0, null);
    expect(r.text).toMatch(/middlegame/i);
    // same phase next move → silent
    const r2 = continuationNarration(START, 19, r.state, null);
    expect(r2.text).toBeNull();
  });

  it('announces a decisive material swing once, then stays quiet', () => {
    const s0 = initialContinuationState(START, 20); // already middlegame
    const upAPiece = 'rnbqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // white +3
    const r = continuationNarration(upAPiece, 22, s0, null);
    expect(r.text).toMatch(/up a piece/i);
    // same balance next move → no repeat
    const r2 = continuationNarration(upAPiece, 23, r.state, null);
    expect(r2.text).toBeNull();
  });

  it('a recapture midpoint is not "up a piece" (WO-MATERIAL-01)', () => {
    const s0 = { phase: 'middlegame' as const, announcedBalance: 0 };
    // Bxf6 just took a knight; …gxf6 (or …Bxf6) retakes — level, not +3.
    const c = new Chess();
    for (const m of 'd4 Nf6 c4 e6 Nc3 d5 Bg5 Be7 Nf3 O-O e3 h6 Bxf6'.split(' ')) c.move(m);
    const last = c.history({ verbose: true }).at(-1)!;
    expect(continuationNarration(c.fen(), 26, s0, { to: last.to, captured: last.captured ?? null }).text).toBeNull();
  });

  it('stays silent on a routine, level move', () => {
    const s0 = { phase: 'middlegame' as const, announcedBalance: 0 };
    expect(continuationNarration(START, 24, s0, null).text).toBeNull();
  });

  it('names the winner on checkmate (side to move is the mated side)', () => {
    expect(continuationResult(true, false, 'b')).toMatch(/White wins/);
    expect(continuationResult(true, false, 'w')).toMatch(/Black wins/);
    expect(continuationResult(false, true, 'w')).toMatch(/draw/i);
  });
});
