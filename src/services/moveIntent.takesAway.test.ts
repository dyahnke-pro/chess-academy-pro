// "The point of X: it takes Y away" must be TRUE on the board (manual claim
// check of run B–H tapes, 2026-09-30). Two false shapes, both real positions:
//  - Re1 "takes …Re8 away" — …Re8 is still legal and Rxe8+ Kxe8 is an even
//    trade; the old test counted a reply as gone merely for being absent from
//    the engine's top lines (item 323).
//  - Bg5 "takes …Ne7 away" — covering e7 is not denying it: Bxe7 Qxe7 is even,
//    and the engine rated …Ne7 their best move (item 132).
import { describe, it, expect } from 'vitest';
import { moveIntent, type IntentReads } from './moveIntent';
import type { AnalysisLine } from '../types';

const L = (cp: number, pv: string[], rank = 1): AnalysisLine => ({ rank, evaluation: cp, moves: pv, mate: null });

describe('moveIntent — "takes it away" only when it is gone', () => {
  it('Re1 does not take …Re8 away when Re8 is still a safe square (item 323)', () => {
    const fen = 'r4k2/pb1p3p/1p1p2p1/8/5P2/2NB1N1P/PPPK2P1/7R w - - 2 20';
    const reads: IntentReads = {
      before: [L(200, ['h1e1', 'h7h5'])],
      passBefore: [L(50, ['a8e8', 'h1e1'])],
      after: [L(200, ['h7h5', 'f3g5']), L(210, ['f8g7', 'f3g5'], 2)],
      passAfter: [L(260, ['f3g5', 'h7h6'])],
    };
    const out = moveIntent(fen, 'Re1', reads, 'student');
    expect(out?.prevents ?? null).toBeNull();
    // Negative control: the same read with …Re8 LOSING (a rook standing on e8
    // would hang) is still named — the guard is about truth, not silence.
    const hang = 'r6k/pb1p3p/1p1p2p1/8/5P2/2NB1N1P/PPPK2P1/7R w - - 2 20';
    const out2 = moveIntent(hang, 'Re1', {
      before: [L(200, ['h1e1', 'h7h5'])],
      passBefore: [L(50, ['a8e8', 'h1e1'])],
      after: [L(200, ['h7h5', 'f3g5'])],
      passAfter: [L(260, ['f3g5', 'h7h6'])],
    }, 'student');
    expect(out2?.prevents?.san).toBe('Re8');
  });

  it('Bg5 does not take …Ne7 away when …Ne7 is an even trade and their best (item 132)', () => {
    const fen = 'rnbqk1nr/pppp1pb1/4p1p1/7p/3PP2P/2N5/PPP2PP1/R1BQKBNR w KQkq - 0 5';
    const reads: IntentReads = {
      before: [L(120, ['c1g5', 'g8e7'])],
      passBefore: [L(-10, ['g8e7', 'c1g5'])],
      after: [L(162, ['g8e7', 'g2g4']), L(170, ['g7f6', 'g5f6'], 2)],
      passAfter: [L(200, ['d1d2', 'g8e7'])],
    };
    for (const prevent of ['deny', 'any+deny'] as const) {
      const out = moveIntent(fen, 'Bg5', reads, 'student', { prevent, prepare: 'unlock' } as never);
      expect(out?.prevents ?? null).toBeNull();
    }
  });
});
