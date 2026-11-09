// The better move's reason on David's Colle replay (2026-11-05), coach seat.
//
// 16…Nfg6 — Stockfish wanted …Neg6. Two defects, both at their producers:
//   1. the reason fell back to the PLAN's leader, a clause about some other
//      move ("Neg6 was their move — the idea is to create a passed pawn on d5",
//      and the same clause for …Qxg5 one move later);
//   2. the board half reused a phrase written to follow "Your knight …", so
//      after "it would" its "it" had nothing to point at ("it would save it
//      from your rook on e1").
import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';
import { moveWhy } from './deliberation';

const BEFORE_QG3 = 'r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p2Q1/2PB4/PP3PPP/R1B1R1K1 w - - 0 16';
const AFTER_QG3 = 'r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p4/2PB2Q1/PP3PPP/R1B1R1K1 b - - 1 16';
const NEG6_LINE = 'e5g6 c1g5 f7f6 g5d2 d4c3 d2c3 e6e5 a2a4'.split(' ');

describe('the better move is given its own reason, or none', () => {
  const reason = betterMoveReason(AFTER_QG3, 'Nfg6', 'Neg6', NEG6_LINE, 'black', { fenBefore: BEFORE_QG3, san: 'Qg3' }, false);

  it('never lends it the plan of another move', () => {
    expect(reason ?? '').not.toMatch(/passed pawn on d5/);
  });

  it('names the piece it saves', () => {
    expect(reason).toBe('it would save the knight from their rook on e1');
  });

  it('the board read names its piece wherever it is said after "it"', () => {
    const w = moveWhy(AFTER_QG3, 'Neg6', 'b', null);
    expect(w).toMatch(/^saves the knight from/);
    expect(w).not.toMatch(/\bsaves it\b/);
  });
});

// 24…Rc7 — Stockfish wanted …Qc7, whose queen eyes g3 down the diagonal. The
// route read "head on to g3, and take the queen there"; the line meets …Qxg3
// with hxg3 — a trade, not a queen won.
describe('a capture the line takes back is said as what it is', () => {
  const PRIOR = '2r1r1k1/1b3p1p/pq2p1pB/1p1p4/8/2P3Q1/P4PPP/R3R1K1 w - - 0 24';
  const FEN = '2r1r1k1/1b3p1p/pq2p1p1/1p1p2B1/8/2P3Q1/P4PPP/R3R1K1 b - - 1 24';
  const reason = (line: string): string | null => betterMoveReason(FEN, 'Rc7', 'Qc7', line.split(' '), 'black', { fenBefore: PRIOR, san: 'Bg5' }, false);

  it('taken back for the same: a trade', () => {
    const r = reason('b6c7 a1c1 c7g3 h2g3');
    expect(r).toBe('it would head on to g3, and trade queens there');
    expect(r).not.toMatch(/take the queen/);
  });

  it('taken back for more: no capture is claimed at all', () => {
    expect(reason('b6c7 g5f4 c7f4 g3f4') ?? '').not.toMatch(/bishop/);
  });
});
