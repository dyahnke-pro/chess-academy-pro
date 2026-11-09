import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent } from './needScore';
import { createStoryStore } from './gameStory';
import { zugzwangProof, type ZugzwangRead } from './zugzwang';

// ZUGZWANG IN REVIEW (WO-STORY-MATRIX-01 P1-9c): the tablebase read Learn makes
// at the student's turn reaches Review's walk, from the student's seat on each
// side of the move.
const KP: ZugzwangRead = { onMove: 0, ifPassed: 1, mutual: false };

function walk(student: 'white' | 'black', zz: Map<number, ZugzwangRead>) {
  // The walk replays from the start; the tablebase read is handed in (the
  // async caller makes it, `zugzwangsForGame`), so any game carries the wire.
  const c = new Chess();
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'];
  const inp = sans.map((san, i) => {
    c.move(san);
    return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: (i % 2 === 0) !== (student === 'white'), classification: 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as ReviewMoveInput;
  });
  return buildReviewSegmentsForTests(inp, student, null, true, 1200, [], coldStudent(1200), 'g', new Map(), new Map(), null, createStoryStore('g'), zz);
}

describe('zugzwang reaches Review', () => {
  it('on their move the student is the one in it', () => {
    const segs = walk('white', new Map([[2, KP]]));
    expect(segs.find((s) => s.ply === 2)?.narration ?? '').toMatch(/Zugzwang: on your move this is a draw\. If it were their move, you would win/);
  });
  it('on the student\'s move the student put them in it', () => {
    const segs = walk('white', new Map([[3, KP]]));
    expect(segs.find((s) => s.ply === 3)?.narration ?? '').toMatch(/You put them in zugzwang/);
  });
  it('no tablebase read, no zugzwang line', () => {
    expect(walk('white', new Map()).some((s) => /zugzwang/i.test(s.narration ?? ''))).toBe(false);
  });
  it('the proof is worded from the student\'s seat on both sides', () => {
    expect(zugzwangProof(KP, true).short).toBe('with the move it is a draw, but if you could pass you win');
    expect(zugzwangProof(KP, false).short).toBe('with the move it is a draw, but if they could pass they win');
  });
});
