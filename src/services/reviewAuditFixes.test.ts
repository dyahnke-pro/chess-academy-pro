// Review prod audit 2026-11-12 (Giri–Carlsen, student Black): two lines false
// on their boards, fixed at their producers.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveDifference } from './weighedMoves';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';

const MOVETEXT = 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Bd7 Be2 Nge7 O-O cxd4 cxd4 Nf5 Nc3 Rc8 Kh1 a6 Bg5 Qb6 Na4 Qa7 Be3 Be7 a3 b5 Nc3 O-O Bd3 Nxe3 fxe3 b4 axb4 Nxb4 e4 Nxd3 Qxd3 dxe4 Nxe4 h6 Rfe1 a5 Qd2 Bc6 Qf4 Qb8 Re2 a4';

describe('the difference between two moves never names the square a move leaves', () => {
  it('25…a4 against …Bxe4: the pawn is not on a5 to be kept guarded', () => {
    const c = new Chess();
    const sans = MOVETEXT.split(' ');
    for (const s of sans.slice(0, -1)) c.move(s);
    const d = moveDifference(c.fen(), 'a4', 'Bxe4', 'your', { a: null, b: null });
    expect(d?.text ?? '').not.toMatch(/pawn on a5/);
  });
});

describe('a sacrifice that forces mate is said by its mate line', () => {
  it('34…Qe1+ (Rxe1 Rxe1#) is not "a sacrifice — compensation: you\'re already on top"', () => {
    const tail = 'Qg4 Qb5 Rae1 Bb4 d5 Bxe1 Nd4 Qd3 Rxe1 Bxd5 Nf6+ Kh8 Nxd5 Qd2 Rd1 Rc1 Nc3 Qe1+';
    const c = new Chess();
    const sans: string[] = [];
    for (const s of [...MOVETEXT.split(' '), ...tail.split(' ')]) { c.move(s); sans.push(s); }
    const r = new Chess();
    const moves = sans.map((san, i) => {
      r.move(san);
      const last = i === sans.length - 1;
      // The audit's own engine reads at these plies (mate is ±29999).
      const before = i === sans.length - 2;
      return { ply: i + 1, san, fenAfter: r.fen(), isCoachMove: i % 2 === 0, classification: last ? 'good' : 'book',
        preMoveEval: last ? -29998 : before ? -707 : 0, evaluation: last ? -29999 : before ? -29998 : 0,
        bestMove: last ? 'd2e1' : null, ...(last ? { pv: { afterPlayed: ['d1e1', 'c1e1'] } } : {}) } as unknown as ReviewMoveInput;
    });
    const segs = buildReviewSegmentsForTests(moves, 'black', null, true, 1400);
    expect(segs[segs.length - 1].narration ?? '').not.toMatch(/is a sacrifice — compensation/);
  }, 60_000);
});
