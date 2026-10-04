import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';

// Clean-pass review walk 2026-10-04 (walk 6), G1 (lichess SI5q0VJz) 27.Rc8: graded
// GREAT, then "Blunder check before you let go of a piece: what can they take
// now? Here the answer was your rook on c8." The review fed the habit lanes the
// raw drop between two reads (about +10 → +7), which the grade — in expected
// points — had already called no loss. Rc8 gives the exchange on purpose.
const g = new Chess(); g.loadPgn(readFileSync('src/services/__fixtures__/SI5q0VJz.pgn', 'utf8'));
const SANS = g.history().slice(0, 55);

function inputs(classification: ReviewMoveInput['classification'], pre = 1000, post = 700): ReviewMoveInput[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    c.move(san);
    const here = i === 52;
    return {
      ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1,
      classification: here ? classification : 'good',
      preMoveEval: here ? pre : 0, evaluation: here ? post : 0,
      bestMove: null,
    } as unknown as ReviewMoveInput;
  });
}
const BLUNDER_CHECK = /Blunder check before you let go of a piece/;

describe('a move not graded as a fault costs nothing in the habit lanes', { timeout: 120_000 }, () => {
  it('27.Rc8 graded great: no blunder check', () => {
    const segs = buildReviewSegments(inputs('great'), 'white', null, true, 1600, [], undefined, 'g');
    expect(segs[52].narration ?? '').not.toMatch(BLUNDER_CHECK);
  });
  it('the same move graded a mistake still gets it (non-vacuous)', () => {
    // A real mistake: +3 → level — the one grader agrees it is a fault.
    const segs = buildReviewSegments(inputs('mistake', 300, 0), 'white', null, true, 1600, [], undefined, 'g');
    expect(segs[52].narration ?? '').toMatch(BLUNDER_CHECK);
  });
});
