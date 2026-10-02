/**
 * REPLAY FENCE — McConnell Defence, 1000-rated (lichess 3iFMOLY6, student
 * White), walked by hand 2026-09-27. Real positions, real Stockfish lines.
 */
import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';
import { renderFundamentalVerdict } from './principleVoice';

describe('ply 11 — a line that trades queens is not "win a rook"', () => {
  // 6.O-O Bg4 7.Bg5 Qxg5 8.Bxf7+ Ke7 9.Nxg5 Bxd1 — each side takes a queen.
  const FEN = 'rnb1k1nr/pp3ppp/2pp1q2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6';
  it('O-O\'s reason is not a won rook', () => {
    const r = betterMoveReason(FEN, 'Bb5', 'O-O', ['e1g1', 'c8g4', 'c1g5', 'f6g5', 'c4f7', 'e8e7', 'f3g5', 'g4d1'], 'white', null) ?? '';
    expect(r).not.toMatch(/win a (rook|piece)/);
  });
  // NEGATIVE CONTROL lives in lookaheadPlan.test (a real won pawn still reads materialSwing > 0).
});

describe('plies 27, 33 — the missed shot is THEIR move, and says so', () => {
  it('the repeat line names whose move was waiting deeper', () => {
    const line = renderFundamentalVerdict([{ id: 'calculation-depth', weight: 1, evidence: { squares: [], moves: [], pvMoves: [], counterfactualClean: true }, facts: { punish: 'Nxe2+' } } as never], { ply: 27, seen: new Set(['calculation-depth']), replySan: null }) ?? '';
    expect(line).toMatch(/their Nxe2\+ was waiting deeper/);
  });
});

describe('ply 39 — "That let them win a pawn" names the move that does it', () => {
  it('after 20.a4 the cost line names …bxc4', async () => {
    const { whatItAllowed } = await import('./concessionBeat');
    const r = whatItAllowed({
      fenBefore: '2kn2nr/p4p2/b2pq1p1/1p2p2p/1PP1P2P/3P2N1/P4PP1/R2QK2R w KQ - 0 20',
      fenAfter: '2kn2nr/p4p2/b2pq1p1/1p2p2p/PPP1P2P/3P2N1/5PP1/R2QK2R b KQ - 0 20',
      opponentPv: ['b5c4', 'b4b5', 'a6b7', 'e1g1', 'g8f6', 'a4a5', 'e6d7', 'd1b1'],
      studentColor: 'white', cpLoss: 68, playedSan: 'a4',
    });
    expect(r?.line).toMatch(/^That let them win a pawn, starting with bxc4\.$/);
  });
});
