import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

describe('review names what they keep doing — the same computer Learn reads (2026-10-15)', () => {
  it('the move that makes it a habit says so', { timeout: 60_000 }, async () => {
    const { buildReviewSegmentsForTests } = await import('./coachFeatureService');
    const c = new Chess();
    // The grades and scores a real read gives this game: …Ng4 hangs the
    // knight to Qxg4 (a blunder), d3 lets it off (a miss), …Nc6 leaves it
    // hanging again (a blunder). The habit counter skips moves the grader
    // called sound, so the grades must be the board's, never a blanket "good".
    const graded: Array<{ san: string; classification: 'good' | 'miss' | 'blunder'; pre: number; after: number }> = [
      { san: 'e4', classification: 'good', pre: 30, after: 30 },
      { san: 'Nf6', classification: 'good', pre: 30, after: 30 },
      { san: 'Nc3', classification: 'good', pre: 30, after: 30 },
      { san: 'Ng4', classification: 'blunder', pre: 30, after: 300 },
      { san: 'd3', classification: 'miss', pre: 300, after: 30 },
      { san: 'Nc6', classification: 'blunder', pre: 30, after: 300 },
    ];
    const inputs = graded.map((g, i) => {
      c.move(g.san);
      return { ply: i + 1, san: g.san, isCoachMove: i % 2 === 1, classification: g.classification, evaluation: g.after, preMoveEval: g.pre, bestMove: null, fenAfter: c.fen() };
    });
    const segs = buildReviewSegmentsForTests(inputs, 'white', null, true, 1500, [], undefined, null);
    expect(segs.find((s) => s.ply === 6)?.narration ?? '').toMatch(/two times now they've left a piece loose under your attack/);
  });
});
