/**
 * REPLAY FENCE — Colle System, ~800-rated (lichess MdVCIY3J, student White),
 * walked by hand 2026-09-27. Real positions, real Stockfish lines (d16).
 */
import { describe, it, expect } from 'vitest';
import { betterMoveReason, callInaccuracyDetailed } from './inaccuracyCall';

describe('ply 27 — cxd4 after …cxd4 is taking the pawn, not "winning" it', () => {
  it('the better move\'s reason says it takes the pawn on d4', () => {
    const r = betterMoveReason('r1bqrnk1/4bppp/p1n1p3/1p1pP2N/3p4/2PB1N2/PP3PPP/R1BQR1K1 w - - 0 14', 'Ng5', 'cxd4',
      ['c3d4', 'c8b7', 'c1d2', 'a8c8', 'd1e2', 'c6a5', 'h2h4', 'a5c4'], 'white',
      // …cxd4, the capture cxd4 takes back: the line finishes a trade.
      { fenBefore: 'r1bqrnk1/4bppp/p1n1p3/1pppP2N/3P4/2PB1N2/PP3PPP/R1BQR1K1 b - - 0 13', san: 'cxd4' }, false) ?? '';
    expect(r).not.toMatch(/win a pawn/);
  });
});

describe('ply 31 — a quiet reply is not what the mistake "let them in with"', () => {
  it('16.Qg3 …Neg6 is not named as the break-in', () => {
    const v = callInaccuracyDetailed({ namesBetterMove: true, priorMove: null,
      fenBefore: 'r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p2Q1/2PB4/PP3PPP/R1B1R1K1 w - - 0 16', playedSan: 'Qg3', bestSan: 'Rxe5',
      bestLineUci: ['e1e5', 'g5f6', 'c3d4', 'g7g6', 'h5f6', 'd8f6'],
      cpLoss: 245, side: 'student', moverColor: 'white',
      replyLineUci: ['e5g6', 'c1g5', 'f7f6', 'g5d2', 'd4c3', 'd2c3'], replySan: 'Nfg6',
    });
    expect(v.call).toBeTruthy();
    expect(v.call?.said ?? '').not.toMatch(/in with Neg6/);
  });
});
