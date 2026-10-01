// unify-the-coach A2 (2026-10-01): review CALLS the Learn student-move computer
// (`studentMoveTeaching`) instead of porting its lanes one by one. The open
// Sicilian recapture 4.Nxd4 is the recapture-choice lane — Learn taught it,
// review never did.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent } from './needScore';

const SANS = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6'];

function inputs(): ReviewMoveInput[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    c.move(san);
    return {
      ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1, classification: 'book',
      preMoveEval: 30, evaluation: 30, bestMove: null,
    } as ReviewMoveInput;
  });
}

describe('review speaks the Learn student-move lanes (A2)', () => {
  it('4.Nxd4 teaches which piece takes back, and why', () => {
    const segs = buildReviewSegments(inputs(), 'white', 'Sicilian Defense', true, 1200, [], coldStudent(1200), 'g');
    expect(segs.find((s) => s.ply === 7)?.narration ?? '').toMatch(/taking back with the knight/);
  });
});
