// ONE WHY-IT-FAILED PER BEAT (Najdorf Zagreb jMVMo1Ua, 2026-10-20). A free-board
// move in review said "That left your knight on b5 hanging — the pawn on a6
// just takes it." twice: once from errorWhyFor, once inside the better move's
// reason (explainBestMoveGrounded appends the same errorWhy sentence).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';

const beat = (sans: string[], bestUci: string, pre: number, post: number, student: 'white' | 'black'): string => {
  const c = new Chess();
  const inputs = sans.map((san, i) => {
    c.move(san);
    const last = i === sans.length - 1;
    return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: (i % 2 === 0) !== (student === 'white'), classification: last ? 'blunder' : 'book', preMoveEval: last ? pre : 0, evaluation: last ? post : 0, bestMove: last ? bestUci : null } as unknown as ReviewMoveInput;
  });
  const segs = buildReviewSegmentsForTests(inputs, student, null, false, 1500);
  return segs[segs.length - 1].narration ?? '';
};

describe('a flagged move says what it left once', () => {
  it('Ndb5 after 5…a6 (the free-board move of the review audit)', () => {
    const n = beat('e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Ndb5'.split(' '), 'c1g5', 31, -321, 'white');
    const hits = n.match(/That left your knight on b5 hanging/g) ?? [];
    expect(hits).toHaveLength(1);
    expect(n).toMatch(/Bg5/);
  }, 120000);
});
