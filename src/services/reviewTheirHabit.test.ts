import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

describe('review names what they keep doing — the same computer Learn reads (2026-10-15)', () => {
  it('the move that makes it a habit says so', { timeout: 60_000 }, async () => {
    const { buildReviewSegments } = await import('./coachFeatureService');
    const c = new Chess();
    const inputs = ['e4', 'Nf6', 'Nc3', 'Ng4', 'd3', 'Nc6'].map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, isCoachMove: i % 2 === 1, classification: 'good' as const, evaluation: 30, preMoveEval: 30, bestMove: null, fenAfter: c.fen() };
    });
    const segs = buildReviewSegments(inputs, 'white', null, true, 1500, [], undefined, null);
    expect(segs.find((s) => s.ply === 6)?.narration ?? '').toMatch(/two times now they've left a piece where you can win it/);
  });
});
