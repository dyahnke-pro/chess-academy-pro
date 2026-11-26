import { describe, expect, it } from 'vitest';
import { allowedReply } from './inaccuracyCall';

// "CAN BE HIT" ONLY WHEN THE HIT COSTS SOMETHING (Coach Build Board, Mistakes
// round 1): a reply that attacks a piece is a reason only when the piece is
// really in danger — a lesser attacker, or one the guards cannot cover.
describe('the allowed reply: a hit is a reason only when it costs', () => {
  it('a queen on a rook its other rook guards is no reason', () => {
    expect(allowedReply('q5k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1', 'h3', ['a8e8', 'g1h2'], 'white')).toBeNull();
  });
  it('a bishop on that rook is: the exchange is lost if it stays', () => {
    expect(allowedReply('6k1/5ppp/8/8/1b6/8/5PPP/R3R1K1 w - - 0 1', 'h3', ['b4d2', 'e1e2'], 'white')?.said).toMatch(/attacks the rook on e1/);
  });
  it('a hit by a piece that is simply taken is no reason', () => {
    expect(allowedReply('6k1/5ppp/8/8/1b6/8/5PPP/R2QR1K1 w - - 0 1', 'h3', ['b4d2', 'd1d2'], 'white')).toBeNull();
  });
  it('a pawn on a knight is: the knight has to move', () => {
    expect(allowedReply('6k1/2p2ppp/8/3N4/8/8/5PPP/R3R1K1 w - - 0 1', 'h3', ['c7c6', 'd5f4'], 'white')?.said).toMatch(/knight on d5/);
  });
});
