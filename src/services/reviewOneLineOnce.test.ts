// ONE LINE, ONE CLAIM, ONE GAME (prod Review 2026-10-29, Carlsen–Caruana,
// plies 42–43): "Their queen on e5 is a discovered attack in waiting — moving
// it unveils their bishop on g7 against your rook on a1", then the next ply
// "Their bishop on g7 and their queen on e5 form a battery on the diagonal,
// bearing down on your rook on a1". One geometry, two wordings, keyed by their
// sentences — so say-once saw two claims.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';

const GAME = 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 d3 d6 c3 g6 Bg5 Bg7 Nbd2 h6 Bh4 O-O O-O b5 Bc2 Qe8 Re1 Nh5 Nf1 Nf4 Ne3 Bb7 a4 Nd8 d4 Nde6 b4 exd4 cxd4 a5 d5 Ng5 Nxg5 hxg5 Bxg5 Qe5 Qg4 Nh5 Rab1'.split(' ');

describe('a line is said once, whatever it is called', () => {
  it('the g7–e5–a1 diagonal is named on one ply only', { timeout: 120_000 }, () => {
    const c = new Chess();
    const segs = buildReviewSegmentsForTests(GAME.map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1, classification: i < 12 ? 'book' : 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
    }), 'white', null, true, 1500);
    const naming = segs.filter((s) => /\bg7\b/.test(s.narration ?? '') && /\ba1\b/.test(s.narration ?? '') && /\be5\b/.test(s.narration ?? '')
      && /battery|discovered attack in waiting/.test(s.narration ?? '')).map((s) => s.ply);
    expect(naming.length).toBeGreaterThan(0);
    expect(naming).toHaveLength(1);
  });
});
