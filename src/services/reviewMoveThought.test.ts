import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, pastTenseReviewNarration, type ReviewMoveInput, type ReviewMoveSegment } from './coachFeatureService';
import { lessonThought } from './moveThoughtFacts';
import { newLessonVoice } from './reviewMoveBriefing';
import { NO_PREV_CAPTURE } from './captureRun';

// ONE COACH: Review says a move through the one composer (WO-ONE-COACH-01
// Build 5, David 2026-10-30: "Remember to unify this build"). On 542 of
// Danya's notes Review's own line for the move said 30.8% of his ideas, the
// composer's 43.7%; on the opponent's moves 19% against 39%.
const walk = (line: string, side: 'white' | 'black'): string[] => {
  const c = new Chess();
  return buildReviewSegmentsForTests(line.split(' ').map((san, i) => {
    c.move(san);
    return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: (i % 2 === 0) !== (side === 'white'), classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
  }), side, null, true, 1400).map((s) => s.narration ?? '');
};

describe('Review says a move through the one composer', () => {
  it("their 2.Nf3 is the lesson's own sentence for it", () => {
    const c = new Chess();
    c.move('e4');
    const theirLast = { fenBefore: c.fen(), san: 'e5' };
    c.move('e5');
    const lesson = lessonThought({
      fenBefore: c.fen(), san: 'Nf3', moverIsStudent: false, prev: NO_PREV_CAPTURE,
      line: ['Nc6', 'Bc4', 'Nf6', 'Ng5'], theirLast,
    }, newLessonVoice());
    expect(lesson).toMatch(/^They play Nf3 — it develops into the game/);
    expect(walk('e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5', 'black')[2]).toContain(lesson.replace(/\.$/, ''));
  }, 60_000);

  it('a threat Review says in its own line is not said again by the move (…Nb4: Nxc2+ once)', () => {
    const ply16 = walk('e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4', 'black')[15];
    expect(ply16.match(/Nxc2\+/g) ?? []).toHaveLength(1);
  }, 60_000);

  it("a principle the rule line teaches is not said again by the move (Nf3's development once)", () => {
    const ply3 = walk('e4 e5 Nf3', 'white')[2];
    expect(ply3).toMatch(/\[rule\]/);
    expect(ply3.match(/develops? into the game/g) ?? []).toHaveLength(1);
  }, 60_000);

  it("a move another line already teaches adds only a second job (…Nxd5: the rule's take-back, no trivia)", () => {
    const ply10 = walk('e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5', 'black')[9];
    expect(ply10).toMatch(/\[rule\] …Nxd5 — /);
    expect(ply10).not.toMatch(/\[move-job\]/);
  }, 60_000);

  it("the move's own head is history, its tag and a present clause beside it (prod audit: \"You play Rxa8: … which is worth more\")", () => {
    const segs = [{ ply: 29, narration: '[move-job] You play Rxa8: it trains on their queen on d8, which is worth more than the rook — pressure they have to answer.', narrationSource: 'per-move' } as unknown as ReviewMoveSegment];
    pastTenseReviewNarration(segs);
    expect(segs[0].narration).toBe('[move-job] You played Rxa8: it trains on their queen on d8, which is worth more than the rook — pressure they have to answer.');
  });
});
