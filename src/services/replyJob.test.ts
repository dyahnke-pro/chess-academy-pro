import { describe, it, expect } from 'vitest';
import { replyJob } from './replyJob';
import { standingRefutations } from './weighedMoves';
import { planTries } from './tryCandidates';

// Real boards and Stockfish lines from the tries bench
// (src/services/__fixtures__/danyaTries.reads.json) and Danya's endgame
// attacks #3. The try is the line's first move, the reply its second.
describe('replyJob — what the reply does against the try', () => {
  it('guards: …Kc7 is met by Kd5, and the king holds the c6 pawn (in pursuit of zugzwang)', () => {
    const j = replyJob('2k5/8/p1P5/P7/3K4/8/8/8 b - - 1 1', ['c8c7', 'd4d5', 'c7c8', 'd5d4'], 'c6', 'b');
    expect(j?.kind).toBe('guards');
    expect(j?.text).toMatch(/^Kd5 (holds|defends) their c-pawn\.$/);
    expect(j?.follow).toMatch(/^The king (holds|defends) their c-pawn\.$/);
  });

  it('kicks: …Qxb2 is met by Rb1, which sends the queen away (knights on the rim)', () => {
    const j = replyJob('1rr3k1/1p1n1ppp/p3pn2/8/Pq6/3P2P1/1P1NPPBP/R2Q1RK1 b - - 5 19', ['b4b2', 'a1b1', 'b2a2', 'd2c4'], null, 'b');
    expect(j?.kind).toBe('kicks');
    expect(j?.text).toMatch(/^Rb1 .*your queen/);
  });

  it('blocks: …Bf5 at the queen on c2 is met by e4, shutting the diagonal (never trust your opponent)', () => {
    const j = replyJob('r1b2rk1/pp3ppp/3b1q2/3B4/8/1P2P1P1/P1Q2P1P/R1B2RK1 b - - 0 15', ['c8f5', 'e3e4', 'f5h3', 'e4e5'], null, 'b');
    expect(j?.kind).toBe('blocks');
    expect(j?.text).toMatch(/^e4 .*your bishop.*their queen/);
  });

  it('counter: …Kg8 is met by Qh5, threatening Qh7 mate (the Greek gift lives on)', () => {
    const j = replyJob('r1b2r2/5pbk/1q2p3/1pn3N1/3p4/8/PP2QPPP/R1B2RK1 b - - 1 17', ['h7g8', 'e2h5', 'f8d8', 'h5f7'], null, 'b');
    expect(j?.kind).toBe('counter');
    expect(j?.text).toMatch(/mate/);
  });

  it('heads for a square: Kc5 is met by …Rd2, the rook going to c2 behind the pawn (a guide to underpromotion)', () => {
    const j = replyJob('8/2P5/1K1r4/8/8/8/8/k7 w - - 1 2', ['b6c5', 'd6d2', 'c5b5', 'd2c2'], null, 'w');
    expect(j?.kind).toBe('heads-for');
    expect(j?.text).toMatch(/^…Rd2 .*c2.*your c-pawn/);
  });

  it('NEGATIVE CONTROL: a king that attacks a knight it then takes did not "kick" it (modern chess technique)', () => {
    const j = replyJob('8/8/4N3/4kP2/p7/8/2K5/8 w - - 1 76', ['e6g7', 'e5f6', 'c2b2', 'f6g7'], null, 'w');
    expect(j?.kind).not.toBe('kicks');
  });

  it('NEGATIVE CONTROL: a king attacking a guarded knight does not kick it (how to play a brilliancy)', () => {
    const j = replyJob('r4rk1/1p3pp1/pPp4p/P1Pp4/3P1qn1/2N5/2Q1RPB1/R4K2 b - - 1 29', ['g4h2', 'f1g1', 'f7f5', 'c2d3'], null, 'b');
    expect(j?.kind).not.toBe('kicks');
  });
});

describe('standingRefutations says the reply\'s job', () => {
  // Danya, endgame attacks #3: "the immediate 29.Qc5 leads nowhere after
  // 29...Qd7! 30.Qxb5 Qd2". Stockfish lines (depth 16), White's seat.
  const FEN = '6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29';
  const best = { evaluation: -7, mate: null, moves: ['f1e2', 'b7e7', 'e2b5', 'a4a3', 'b2a3'] };
  const qc5 = { evaluation: -92, mate: null, moves: ['d4c5', 'b7d7', 'c5b5', 'd7d2', 'b5e2', 'd2c1', 'g1f2', 'f6d5'] };

  it('Qc5 runs into …Qd7, and the queen heads for d2 to hit the e3 pawn', () => {
    const considered = new Map(planTries(FEN).map((t) => [t.uci, { why: 'plan' as const, target: t.target }]));
    const t = standingRefutations({ fen: FEN, student: 'w', rating: 1400, reads: [best, qc5], considered }).find((x) => x.san === 'Qc5');
    expect(t?.text).toMatch(/…Qd7\. The queen heads for d2, where it hits your e-pawn\./);
    expect(t?.squares).toContain('d2');
  });
});
